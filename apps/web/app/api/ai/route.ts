import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════
   SERVER-SIDE AI PROXY
   The Groq API key lives only here (server env).
   The browser calls /api/ai with messages and
   never sees the key. Adds a same-origin check
   and a small per-IP rate limit.
   ═══════════════════════════════════════════ */

export const runtime = "nodejs";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Same model pool the client used before — tried in order until one answers. */
const MODEL_POOL = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
].filter(Boolean) as string[];

let cachedModel: string | null = null;

/* ── Minimal in-memory per-IP rate limit (10 req / min) ── */
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = hits.get(ip);
  if (!bucket || now > bucket.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    if (hits.size > 5_000) hits.clear(); // avoid unbounded growth
    return false;
  }
  bucket.count += 1;
  return bucket.count > 10;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  // Same-origin guard — reject cross-site requests from foreign origins.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded, slow down." }, { status: 429 });
  }

  let body: { messages?: ChatMessage[]; temperature?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages;
  const temperature = typeof body.temperature === "number" ? body.temperature : 0.7;

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    return NextResponse.json({ error: "messages must be a non-empty array (max 40)" }, { status: 400 });
  }
  for (const m of messages) {
    if (!m || typeof m.content !== "string" || !["system", "user", "assistant"].includes(m.role)) {
      return NextResponse.json({ error: "Invalid message shape" }, { status: 400 });
    }
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json({ error: "Groq API Key missing on server" }, { status: 500 });
  }

  let lastError: string = "No Groq model available";
  const candidates = cachedModel ? [cachedModel] : MODEL_POOL;

  for (const model of candidates) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 2048,
          ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        lastError = `Groq returned HTTP ${res.status} for ${model}`;
        // Model unavailable → try the next one; other errors are not model-related.
        if (res.status === 404 || (res.status === 400 && errText.includes("model_not_found"))) continue;
        return NextResponse.json({ error: lastError }, { status: 502 });
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = "Empty AI response";
        continue;
      }
      cachedModel = model;
      return NextResponse.json({ content });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Upstream fetch failed";
    }
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
