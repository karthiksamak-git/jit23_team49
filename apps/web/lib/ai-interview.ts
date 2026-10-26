/* ═══════════════════════════════════════════
   CAREER SENSEI INTERVIEW CLIENT
   Browser side of the raulf-the-recruiter port:
   builds the scenario seed from the player's
   profile + progress and talks to
   /api/interview/{start,answer,end}.
   ═══════════════════════════════════════════ */

export interface InterviewTurn {
  speaker: "interviewer" | "candidate";
  text: string;
}

/** Player details + progress the interview is seeded with. */
export interface SenseiProfile {
  name: string;
  domain: string;
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  coins: number;
  missionsCompleted: number;
  difficulty: string;
}

/**
 * Scenario seed for the interviewer, combining the candidate's details,
 * their progress, and the chosen interview focus (raulf-style seed
 * instruction — the LLM treats it as the scenario and constraints).
 */
export function buildSeed(profile: SenseiProfile, focus: string): string {
  return [
    "A friendly mock interview inside CareerVerse, an IT career-learning platform.",
    `Candidate: ${profile.name || "Student"}`,
    `Target career path: ${profile.domain || "General IT"}`,
    `Current progress: Level ${profile.level}, ${profile.xp} XP, ${profile.streak}-day streak, ${profile.missionsCompleted} missions completed`,
    `Candidate's self-rated starting level: ${profile.difficulty}`,
    `Interview focus: ${focus || `practical ${profile.domain || "IT"} questions matched to the candidate's level`}`,
    "Conduct about 6 questions, one at a time, then stop and wait — the session is evaluated when the candidate ends it.",
  ].join("\n");
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

interface TurnResponse {
  interviewer: string;
  audio: string | null;
}

/** Open a session — returns the Career Sensei's opening question + its audio. */
export async function startSenseiInterview(seed: string): Promise<TurnResponse> {
  return postJson<TurnResponse>("/api/interview/start", { seed });
}

/** Submit a spoken answer (browser recording) — returns transcript + next question. */
export async function submitVoiceAnswer(
  seed: string,
  history: InterviewTurn[],
  recording: Blob
): Promise<{ transcript: string } & TurnResponse> {
  const form = new FormData();
  form.append("seed", seed);
  form.append("history", JSON.stringify(history));
  form.append("file", recording, recording.type.includes("webm") ? "answer.webm" : "answer.wav");
  const res = await fetch("/api/interview/answer", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as { transcript: string } & TurnResponse;
}

/** Submit a typed answer (fallback when no microphone is available). */
export async function submitTextAnswer(
  seed: string,
  history: InterviewTurn[],
  text: string
): Promise<TurnResponse> {
  return postJson<TurnResponse>("/api/interview/answer", { seed, history, text });
}

/** End the session — returns the qualitative Language/Content/Overall evaluation. */
export async function endSenseiInterview(seed: string, history: InterviewTurn[]): Promise<{ evaluation: string }> {
  return postJson<{ evaluation: string }>("/api/interview/end", { seed, history });
}

/** Decode a base64 WAV into an object URL for playback (caller revokes it). */
export function base64ToAudioUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
}
