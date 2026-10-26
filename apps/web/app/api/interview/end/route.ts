import { NextRequest, NextResponse } from "next/server";
import { guardRoute } from "@/lib/server-route-guard";
import { evaluateInterviewSession } from "@/lib/interview-llm";
import type { InterviewTurn } from "@/lib/ai-interview";

export const runtime = "nodejs";

/* Port of raulf's /api/session/:id/end — qualitative Language / Content /
   Overall feedback over the full transcript, no numeric scores. */

function parseHistory(raw: unknown): InterviewTurn[] | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 80) return null;
  const turns: InterviewTurn[] = [];
  for (const t of raw) {
    if (!t || (t.speaker !== "interviewer" && t.speaker !== "candidate") || typeof t.text !== "string") {
      return null;
    }
    turns.push({ speaker: t.speaker, text: t.text });
  }
  return turns;
}

export async function POST(req: NextRequest) {
  const denied = guardRoute(req);
  if (denied) return denied;

  let body: { seed?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const seed = typeof body.seed === "string" ? body.seed.trim() : "";
  const history = parseHistory(body.history);
  if (!seed || !history) {
    return NextResponse.json(
      { error: "Finish at least one question exchange before ending the interview" },
      { status: 400 }
    );
  }

  try {
    const evaluation = await evaluateInterviewSession(seed, history);
    return NextResponse.json({ evaluation }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { error: `Evaluation failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 }
    );
  }
}
