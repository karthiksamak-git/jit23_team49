import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════
   CODE EXECUTION PROXY
   Forwards validated requests to the local
   Piston engine (docker compose service
   "engine", default http://localhost:2000).
   Set PISTON_URL to point elsewhere.
   Same-origin guarded — this endpoint runs
   arbitrary user code on the engine, so it
   must never be reachable cross-site.
   ═══════════════════════════════════════════ */

export const runtime = "nodejs";

const PISTON_URL =
  process.env.PISTON_URL || "http://localhost:2000/api/v2/execute";

const MAX_SOURCE_CHARS = 200_000;
const MAX_STDIN_CHARS = 10_000;

export async function POST(req: NextRequest) {
  // Same-origin guard — foreign sites must not be able to burn our engine.
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

  let body: {
    language?: string;
    version?: string;
    files?: { name?: string; content?: string }[];
    stdin?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const language = body.language;
  const version = body.version || "*";
  const file = body.files?.[0];
  const content = file?.content;

  if (
    !language ||
    typeof language !== "string" ||
    language.length > 40 ||
    typeof version !== "string" ||
    version.length > 40 ||
    typeof content !== "string" ||
    !content ||
    content.length > MAX_SOURCE_CHARS
  ) {
    return NextResponse.json({ error: "Invalid execution request" }, { status: 400 });
  }

  const stdin =
    typeof body.stdin === "string" ? body.stdin.slice(0, MAX_STDIN_CHARS) : "";

  try {
    const res = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        version,
        files: [{ name: file?.name || "main", content }],
        stdin,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Engine returned HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        error:
          "Code engine unreachable. Start it with `npm run engine:up` (Docker) — JavaScript still runs without it.",
      },
      { status: 503 }
    );
  }
}
