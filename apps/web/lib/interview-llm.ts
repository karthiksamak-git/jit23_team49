/* ═══════════════════════════════════════════
   SERVER-ONLY INTERVIEW LLM
   TypeScript port of raulf-the-recruiter's
   groq_llm.py + session_evaluator.py prompts:
   Career Sensei conducts the interview turn by
   turn, then grades Language / Content /
   Overall after the session ends.
   Import ONLY from route handlers.
   ═══════════════════════════════════════════ */

import type { InterviewTurn } from "./ai-interview";

const CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Same model pool style as /api/ai — tried in order until one answers. */
const MODEL_POOL = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  // llama-3.3-70b-versatile was retired by Groq (404) — qwen is the live backstop.
  "qwen/qwen3.8-27b",
].filter(Boolean) as string[];

const MAX_TOKENS = 512;
const OPENING_PROMPT = "Begin the interview now with your opening question.";
const INTERVIEWER_NAME = "Career Sensei";

let cachedModel: string | null = null;

interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function systemPrompt(seedInstruction: string): string {
  return (
    `You are ${INTERVIEWER_NAME}, a supportive career coach.\n` +
    `At the start of a new session, begin with exactly: 'Hi, I'm ${INTERVIEWER_NAME}.' Do not call yourself a mentor, interviewer, or facilitator. Then ask one opening question.\n` +
    "Use the Seed Instruction below as the scenario and constraints for the interview.\n" +
    "Conduct the interview in English even if the Seed Instruction is written in another language.\n" +
    "Stay in character as the interviewer.\n" +
    "Never correct the speaker's English during the interview.\n" +
    "Save all feedback for the evaluation phase after the session.\n\n" +
    `Seed Instruction:\n${seedInstruction.trim()}`
  );
}

function messagesFromHistory(history: InterviewTurn[]): LlmMessage[] {
  const messages: LlmMessage[] = [{ role: "user", content: OPENING_PROMPT }];
  for (const turn of history) {
    messages.push({
      role: turn.speaker === "interviewer" ? "assistant" : "user",
      content: turn.text,
    });
  }
  return messages;
}

async function createText(system: string, messages: LlmMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
  if (!apiKey) throw new Error("Groq API Key missing on server");

  const candidates = cachedModel
    ? [cachedModel, ...MODEL_POOL.filter((m) => m !== cachedModel)]
    : MODEL_POOL;

  let lastError = "No Groq model available";
  for (const model of candidates) {
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, ...messages],
          max_tokens: MAX_TOKENS,
          ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        }),
      });
      if (!res.ok) {
        lastError = `Groq returned HTTP ${res.status} for ${model}`;
        continue;
      }
      const data = await res.json();
      const text: string = (data.choices?.[0]?.message?.content || "").trim();
      if (!text) {
        lastError = "Empty AI response";
        continue;
      }
      cachedModel = model;
      return text;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Upstream fetch failed";
    }
  }
  throw new Error(lastError);
}

/** Next interviewer turn — the opening (no history) always greets by name. */
export async function nextInterviewTurn(seed: string, history: InterviewTurn[]): Promise<string> {
  let response = await createText(systemPrompt(seed), messagesFromHistory(history));
  if (history.length === 0) {
    const greeting = `Hi, I'm ${INTERVIEWER_NAME}.`;
    if (!response.toLowerCase().startsWith(greeting.toLowerCase())) {
      response = `${greeting} ${response}`;
    }
  }
  return response;
}

function evaluationPrompt(seed: string, history: InterviewTurn[]): string {
  let interviewerN = 0;
  let speakerN = 0;
  const transcript = history
    .map((turn) =>
      turn.speaker === "interviewer"
        ? `Interviewer ${++interviewerN}: ${turn.text}`
        : `Speaker ${++speakerN}: ${turn.text}`
    )
    .join("\n");

  return (
    "You are evaluating an English-language mock interview after the session has ended.\n" +
    "The transcript below came from speech recognition, so minor STT artifacts such as punctuation errors " +
    "or homophone mistakes should not be nitpicked unless they materially affect meaning.\n" +
    "Use the persisted Seed Instruction as the scenario for judging content quality.\n" +
    "Return qualitative feedback only. Do not include numeric scores.\n" +
    "Write markdown with these sections:\n" +
    "1. Language\n" +
    "- CEFR grade (A1-C2)\n" +
    "- Incorrect word usage as what you said -> what a native speaker would say -> why\n" +
    "- Filler-word count plus the actual fillers used\n" +
    "- Recurring grammar patterns only\n" +
    "2. Content\n" +
    "- Short per-question assessment\n" +
    "- Strongest answer\n" +
    "- Weakest answer\n" +
    "3. Overall\n" +
    "- A 2-3 sentence summary\n" +
    "- Top 3 things to practice next\n\n" +
    `Seed Instruction:\n${seed.trim()}\n\n` +
    `Transcript:\n${transcript}`
  );
}

/** End-of-session evaluation (port of session_evaluator.py). */
export async function evaluateInterviewSession(seed: string, history: InterviewTurn[]): Promise<string> {
  return createText(
    "You are an English coach evaluating a completed mock interview.\n" +
      "Follow the user's requested markdown structure exactly and keep the feedback qualitative.",
    [{ role: "user", content: evaluationPrompt(seed, history) }]
  );
}
