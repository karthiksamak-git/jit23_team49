import { NextRequest, NextResponse } from "next/server";
import { guardRoute } from "@/lib/server-route-guard";
import { nextInterviewTurn } from "@/lib/interview-llm";
import { synthesizeSpeech } from "@/lib/groq-speech";

export const runtime = "nodejs";

/* Port of raulf's /api/start — seeds the session and returns the
   Career Sensei's opening question, voiced when speech is available. */

export async function POST(req: NextRequest) {
  const denied = guardRoute(req);
  if (denied) return denied;

  let body: { seed?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const seed = typeof body.seed === "string" ? body.seed.trim() : "";
  if (!seed) {
    return NextResponse.json({ error: "Add a short description of the interview you want to practice" }, { status: 400 });
  }
  if (seed.length > 2000) {
    return NextResponse.json({ error: "Keep the interview focus under 2000 characters" }, { status: 400 });
  }

  try {
    const interviewer = await nextInterviewTurn(seed, []);
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
    const wav = apiKey ? await synthesizeSpeech(apiKey, interviewer) : null;
    return NextResponse.json(
      { interviewer, audio: wav ? wav.toString("base64") : null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: `The interview request failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 }
    );
  }
}
