/* Temporary end-to-end check for the ported interview routes:
   start (LLM+TTS) → answer with the produced WAV (Whisper roundtrip) →
   typed answer → end (evaluation). Prints PASS/FAIL per step. */
const BASE = "http://localhost:3000";
const seed =
  "A friendly mock interview for a Junior Backend Developer candidate in CareerVerse. Candidate: Test User. Keep it short.";

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log("ok  :", label);
  else { fails++; console.log("FAIL:", label, extra ?? ""); }
};

// 1. start
let res = await fetch(`${BASE}/api/interview/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ seed }),
});
const start = await res.json().catch(() => ({}));
ok(res.status === 200 && typeof start.interviewer === "string", "start → 200 + interviewer", JSON.stringify(start).slice(0, 300));
ok(start.interviewer?.startsWith("Hi, I'm Career Sensei."), "opening greets by name", start.interviewer?.slice(0, 80));
ok(typeof start.audio === "string" && start.audio.length > 1000, "start returns TTS audio", typeof start.audio);

let finalHistory = [];

if (typeof start.audio === "string") {
  // 2a. voice roundtrip: feed the Sensei's own WAV through Whisper
  const wav = Buffer.from(start.audio, "base64");
  ok(wav.slice(0, 4).toString("ascii") === "RIFF" && wav.slice(8, 12).toString("ascii") === "WAVE", "audio is valid WAV");
  const form = new FormData();
  form.append("seed", seed);
  form.append("history", JSON.stringify([{ speaker: "interviewer", text: start.interviewer }]));
  form.append("file", new Blob([wav], { type: "audio/wav" }), "answer.wav");
  res = await fetch(`${BASE}/api/interview/answer`, { method: "POST", body: form });
  const voice = await res.json().catch(() => ({}));
  ok(res.status === 200 && typeof voice.transcript === "string" && voice.transcript.length > 0,
    "voice answer → Whisper transcript", JSON.stringify(voice).slice(0, 300));
  ok(typeof voice.interviewer === "string" && voice.interviewer.length > 0, "voice answer → next question", "");
  console.log("     transcript:", JSON.stringify(voice.transcript || null));
  console.log("     next:", (voice.interviewer || "").slice(0, 110));
  if (voice.transcript && voice.interviewer) {
    finalHistory = [
      { speaker: "interviewer", text: start.interviewer },
      { speaker: "candidate", text: voice.transcript },
      { speaker: "interviewer", text: voice.interviewer },
    ];
  }
}

// 2b. typed answer (text fallback)
res = await fetch(`${BASE}/api/interview/answer`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    seed,
    history: [{ speaker: "interviewer", text: start.interviewer }],
    text: "I would add a composite index on the filter columns and cache the hot query for a short TTL.",
  }),
});
const typed = await res.json().catch(() => ({}));
ok(res.status === 200 && typeof typed.interviewer === "string", "typed answer → next question", JSON.stringify(typed).slice(0, 300));
console.log("     next:", (typed.interviewer || "").slice(0, 110));
if (typed.interviewer) {
  finalHistory = [
    { speaker: "interviewer", text: start.interviewer },
    { speaker: "candidate", text: "I would add a composite index on the filter columns and cache the hot query for a short TTL." },
    { speaker: "interviewer", text: typed.interviewer },
  ];
}

// 3. end → evaluation
ok(finalHistory.length >= 2, "have a session history to evaluate");
res = await fetch(`${BASE}/api/interview/end`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ seed, history: finalHistory }),
});
const done = await res.json().catch(() => ({}));
ok(res.status === 200 && typeof done.evaluation === "string", "end → evaluation", JSON.stringify(done).slice(0, 300));
const ev = done.evaluation || "";
ok(/Language/i.test(ev) && /Content/i.test(ev) && /Overall/i.test(ev), "evaluation has Language/Content/Overall", ev.slice(0, 120));
console.log("     evaluation preview:", ev.slice(0, 200).replace(/\n/g, " | "));

// 4. guardrails
res = await fetch(`${BASE}/api/interview/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: "http://evil.example" },
  body: JSON.stringify({ seed }),
});
ok(res.status === 403, `foreign Origin rejected (got ${res.status})`);
res = await fetch(`${BASE}/api/interview/end`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ seed, history: [{ speaker: "interviewer", text: "hi" }] }),
});
ok(res.status === 400, `end with too-short history rejected (got ${res.status})`);

console.log(fails === 0 ? "\nALL ROUTE CHECKS PASSED" : `\n${fails} FAILURES`);
process.exit(fails ? 1 : 0);
