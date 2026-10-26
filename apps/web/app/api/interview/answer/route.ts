import { NextRequest, NextResponse } from "next/server";
import { guardRoute } from "@/lib/server-route-guard";
import { nextInterviewTurn } from "@/lib/interview-llm";
import { synthesizeSpeech, transcribeAudio } from "@/lib/groq-speech";
import type { InterviewTurn } from "@/lib/ai-interview";

export const runtime = "nodejs";

/* Port of raulf's /api/session/:id/answer — accepts the browser recording
   (Whisper transcript) or a typed fallback answer, then produces the next
   interviewer turn with speech. Stateless: the client sends the full turn
   history, and the pending answer is appended here to enforce ordering. */

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function parseHistory(raw: unknown): InterviewTurn[] | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed) || parsed.length > 80) return null;
  const turns: InterviewTurn[] = [];
  for (const t of parsed) {
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

  const contentType = req.headers.get("content-type") || "";
  const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

  let seed = "";
  let history: InterviewTurn[] | null = null;
  let answerText = "";
  let transcript: string | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      seed = typeof form.get("seed") === "string" ? (form.get("seed") as string).trim() : "";
      history = parseHistory(form.get("history"));
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No recording was received" }, { status: 400 });
      }
      if (file.size === 0 || file.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: "Recording is too large. Keep it under 25 MB and try again." }, { status: 400 });
      }
      if (!apiKey) {
        return NextResponse.json({ error: "Groq API Key missing on server" }, { status: 500 });
      }
      const audio = Buffer.from(await file.arrayBuffer());
      const mime = (file.type || "audio/webm").split(";")[0].toLowerCase();
      const filename = mime.includes("wav") ? "answer.wav" : "answer.webm";
      transcript = await transcribeAudio(apiKey, audio, filename, mime);
      if (!transcript) {
        return NextResponse.json({ error: "I couldn't hear any words. Please try recording again." }, { status: 400 });
      }
      answerText = transcript;
    } else {
      let body: { seed?: unknown; history?: unknown; text?: unknown };
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      seed = typeof body.seed === "string" ? body.seed.trim() : "";
      history = parseHistory(body.history);
      answerText = typeof body.text === "string" ? body.text.trim() : "";
      if (!answerText) {
        return NextResponse.json({ error: "Type an answer or record your voice first." }, { status: 400 });
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 502 }
    );
  }

  if (!seed || !history) {
    return NextResponse.json({ error: "Missing interview seed or history" }, { status: 400 });
  }
  if (seed.length > 2000) {
    return NextResponse.json({ error: "Interview focus is too long" }, { status: 400 });
  }

  try {
    const withAnswer: InterviewTurn[] = [...history, { speaker: "candidate", text: answerText }];
    const interviewer = await nextInterviewTurn(seed, withAnswer);
    const wav = apiKey ? await synthesizeSpeech(apiKey, interviewer) : null;
    return NextResponse.json(
      {
        ...(transcript !== null ? { transcript } : {}),
        interviewer,
        audio: wav ? wav.toString("base64") : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: `The interview request failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 }
    );
  }
}
