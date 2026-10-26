/* ═══════════════════════════════════════════
   SERVER-ONLY ROUTE GUARD
   Same-origin check + per-IP rate limit for
   the interview API routes (mirrors the
   protections on /api/ai).
   ═══════════════════════════════════════════ */

import { NextResponse, type NextRequest } from "next/server";

const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const bucket = hits.get(ip);
  if (!bucket || bucket.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    if (hits.size > 5_000) hits.clear();
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

/** Returns an error response to send, or null when the request may proceed. */
export function guardRoute(req: NextRequest, perMinute = 30): NextResponse | null {
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
  if (rateLimited(ip, perMinute)) {
    return NextResponse.json({ error: "Rate limit exceeded, slow down." }, { status: 429 });
  }
  return null;
}
