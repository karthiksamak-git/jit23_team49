"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useGame } from "@/lib/game-context";
import {
  base64ToAudioUrl,
  buildSeed,
  endSenseiInterview,
  startSenseiInterview,
  submitVoiceAnswer,
  type InterviewTurn,
  type SenseiProfile,
} from "@/lib/ai-interview";
import "./interview.css";

/* ═══════════════════════════════════════════
   MOCK INTERVIEW — CAREER SENSEI
   Faithful port of the original raulf-the-recruiter
   interface (index.html + app.js), wired to our
   /api/interview routes and the player profile.

   The microphone is ALWAYS ON during a session:
   a voice-activity detector starts recording the
   moment you speak, stops after a short pause, and
   submits the answer automatically.
   ═══════════════════════════════════════════ */

/* ── Inline **bold** / *italic* rendering for AI-produced text ── */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`b${i}`} className="text-[#f0e4cb] font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(
        <em key={`i${i}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    last = m.index + token.length;
    i += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/* ── Session-notes markdown → styled blocks (port of raulf's renderMarkdown) ── */
function EvaluationView({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  return (
    <div className="evaluation-content space-y-2 text-left">
      {lines.map((raw, i) => {
        const line = raw.trim();
        if (!line) return <div key={i} className="h-1" />;
        if (line === "---" || line === "***") return <div key={i} className="h-px bg-[#ffffff20] my-2" />;
        if (line.startsWith("|")) {
          if (/^[|\s\-:]+$/.test(line)) return null; // table separator row
          const cells = line.split("|").slice(1, -1).map((c) => c.trim());
          return (
            <div key={i} className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#d1ccbf] border-b border-[#b99d6140] py-1.5">
              {cells.map((cell, ci) => (
                <span key={ci} className="min-w-[9rem] flex-1">
                  {renderInline(cell)}
                </span>
              ))}
            </div>
          );
        }
        const heading = line.match(/^#{1,6}\s+(.*)$/);
        if (heading) {
          return (
            <h4 key={i} className="font-semibold text-[#eadab9] pt-3">
              {heading[1]}
            </h4>
          );
        }
        const numbered = line.match(/^\d+\.\s+(.*)$/);
        if (numbered) {
          return (
            <div key={i} className="flex gap-2.5 text-sm text-[#d4cec2] leading-relaxed">
              <span className="text-[#c4a66c] flex-shrink-0">{numbered[0].match(/^\d+\./)?.[0]}</span>
              <span>{renderInline(numbered[1])}</span>
            </div>
          );
        }
        const bullet = line.match(/^[-*]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2.5 text-sm text-[#d4cec2] leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#c4a66c] flex-shrink-0" />
              <span>{renderInline(bullet[1])}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-sm text-[#d4cec2] leading-relaxed">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

type DialogStatus =
  | "READY"
  | "GETTING READY"
  | "SPEAKING"
  | "LISTENING"
  | "THINKING"
  | "READY WHEN YOU ARE"
  | "WRAPPING UP"
  | "SESSION COMPLETE";

type SessionLabel =
  | "YOUR PRIVATE PRACTICE"
  | "PREPARING YOUR SESSION"
  | "INTERVIEW IN PROGRESS"
  | "PRACTICE COMPLETE";

const WELCOME = "Welcome. Let's get you ready for your next opportunity.";

export default function MockInterviewPage() {
  const { player, addXp, addCoins } = useGame();

  /* Player details + progress the interview is seeded with */
  const profile: SenseiProfile = useMemo(
    () => ({
      name: player.characterName || "Learner",
      domain: player.recommendedDomain || player.realmName || "General IT",
      level: player.level,
      xp: player.xp,
      xpToNext: player.xpToNext,
      streak: player.streak,
      coins: player.coins,
      missionsCompleted: player.completedMissions.length,
      difficulty: player.difficultyLevel || "Beginner",
    }),
    [player]
  );

  /* ── Session state ── */
  const [phase, setPhase] = useState<"idle" | "live" | "ended">("idle");
  const [seedText, setSeedText] = useState("");
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [evaluation, setEvaluation] = useState("");
  const [dialogStatus, setDialogStatus] = useState<DialogStatus>("READY");
  const [sessionLabel, setSessionLabel] = useState<SessionLabel>("YOUR PRIVATE PRACTICE");
  const [statusLine, setStatusLine] = useState(
    "Your microphone listens for speech while the interview is active."
  );
  const [micEnabled, setMicEnabled] = useState(false);
  const [micPaused, setMicPaused] = useState(false);
  const [busy, setBusyState] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [awarded, setAwarded] = useState(false);

  /* ── Refs ── */
  const sceneRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackSamplesRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micSamplesRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const utteranceStartRef = useRef(0);
  const lastSpeechRef = useRef(0);
  const noiseFloorRef = useRef(0.003);
  const queueRef = useRef<Blob[]>([]);
  const busyRef = useRef(false);
  const liveRef = useRef(false);
  const micEnabledRef = useRef(false);
  const micPausedRef = useRef(false);
  const turnsRef = useRef<InterviewTurn[]>([]);
  const seedRef = useRef("");
  const questionCountRef = useRef(0);
  const monitorRafRef = useRef(0);
  const speechRafRef = useRef(0);
  const toastTimerRef = useRef(0);

  /* Prefill the seed with the player's profile until the user edits it */
  const seedTouchedRef = useRef(false);
  useEffect(() => {
    if (seedTouchedRef.current) return;
    setSeedText(buildSeed(profile, ""));
  }, [profile]);

  /* Keep the transcript scrolled to the newest message */
  useEffect(() => {
    const el = conversationRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  /* Latest-render handles for the VAD / MediaRecorder callbacks */
  const startUtteranceRef = useRef<(now: number) => void>(() => {});
  const processQueueRef = useRef<() => void>(() => {});
  const submitRecordingRef = useRef<(blob: Blob) => void>(() => {});
  const settersRef = useRef({ setDialogStatus, setStatusLine });
  useEffect(() => {
    startUtteranceRef.current = startUtterance;
    processQueueRef.current = processQueue;
    submitRecordingRef.current = submitRecording;
    settersRef.current = { setDialogStatus, setStatusLine };
  });

  /* Unmount cleanup: release mic, audio, timers */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(monitorRafRef.current);
      cancelAnimationFrame(speechRafRef.current);
      window.clearTimeout(toastTimerRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state === "recording") {
        discardRef.current = true;
        try { rec.stop(); } catch { /* already stopped */ }
      }
      micSourceRef.current?.disconnect();
      micRef.current?.getTracks().forEach((t) => t.stop());
      micRef.current = null;
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  function setBusy(value: boolean) {
    busyRef.current = value;
    setBusyState(value);
  }

  function showToast(message: string) {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 5000);
  }

  function commitTurns(next: InterviewTurn[]) {
    turnsRef.current = next;
    setTurns(next);
  }

  /* ── Audio playback of the interviewer's voice ── */
  function prepareAudioGraph() {
    if (audioCtxRef.current) {
      audioCtxRef.current.resume().catch(() => {});
      return;
    }
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const el = audioRef.current;
      if (el) {
        const source = ctx.createMediaElementSource(el);
        source.connect(analyser);
        analyser.connect(ctx.destination);
      }
      playbackAnalyserRef.current = analyser;
      playbackSamplesRef.current = new Uint8Array(analyser.fftSize);
      audioCtxRef.current = ctx;
      ctx.resume().catch(() => {});
    } catch {
      audioCtxRef.current = null;
      playbackAnalyserRef.current = null;
    }
  }

  function startSpeechAnimation() {
    const scene = sceneRef.current;
    if (!scene) return;
    cancelAnimationFrame(speechRafRef.current);
    const tick = () => {
      let level = 0;
      const analyser = playbackAnalyserRef.current;
      const samples = playbackSamplesRef.current;
      if (analyser && samples) {
        analyser.getByteTimeDomainData(samples);
        let squares = 0;
        for (const sample of samples) {
          const value = (sample - 128) / 128;
          squares += value * value;
        }
        level = Math.min(Math.sqrt(squares / samples.length) * 8, 1);
      } else {
        level = 0.35 + Math.abs(Math.sin((performance.now() / 1000) * 13)) * 0.35;
      }
      scene.style.setProperty("--voice-offset", `${-Math.min(level * 6, 6)}px`);
      scene.style.setProperty("--voice-scale", (1 + level * 0.015).toFixed(3));
      scene.style.setProperty("--voice-glow", `${Math.round(level * 30)}px`);
      speechRafRef.current = requestAnimationFrame(tick);
    };
    speechRafRef.current = requestAnimationFrame(tick);
  }

  function stopSpeechAnimation() {
    cancelAnimationFrame(speechRafRef.current);
    const scene = sceneRef.current;
    if (scene) {
      scene.style.setProperty("--voice-offset", "0px");
      scene.style.setProperty("--voice-scale", "1");
      scene.style.setProperty("--voice-glow", "0px");
    }
  }

  function handleAudioPlay() {
    setSpeaking(true);
    if (liveRef.current) setDialogStatus("SPEAKING");
    cancelAnimationFrame(speechRafRef.current);
    startSpeechAnimation();
  }

  function handleAudioStop() {
    setSpeaking(false);
    stopSpeechAnimation();
    if (liveRef.current) setDialogStatus("READY WHEN YOU ARE");
    processQueue();
  }

  function setAudio(encoded: string | null) {
    if (!encoded) return;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const url = base64ToAudioUrl(encoded);
    audioUrlRef.current = url;
    const el = audioRef.current;
    if (el) {
      el.src = url;
      el.load();
    }
  }

  function playAudio() {
    audioRef.current?.play().catch(() => {
      setStatusLine("Mic is on. Use Replay question if you want to hear Career Sensei again.");
      processQueue();
    });
  }

  function stopAudio() {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }

  function replayAudio() {
    audioRef.current?.play().catch(() => showToast("Audio playback could not start."));
  }

  /* ── Always-on microphone (VAD, ported from raulf's app.js) ── */
  async function enableMicrophone() {
    if (micEnabledRef.current && micRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("This browser does not support continuous microphone recording.");
    }
    prepareAudioGraph();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    micRef.current = stream;
    micEnabledRef.current = true;
    micPausedRef.current = false;
    setMicEnabled(true);
    setMicPaused(false);

    const ctx = audioCtxRef.current;
    if (ctx) {
      try {
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        micSourceRef.current = source;
        micAnalyserRef.current = analyser;
        micSamplesRef.current = new Uint8Array(analyser.fftSize);
      } catch {
        micAnalyserRef.current = null;
      }
    }
    if (!micAnalyserRef.current) {
      disableMicrophone(false);
      throw new Error("Microphone analysis unavailable — allow microphone access and try again.");
    }
    startMonitor();
  }

  function disableMicrophone(paused: boolean) {
    micEnabledRef.current = false;
    micPausedRef.current = paused;
    setMicEnabled(false);
    setMicPaused(paused);
    cancelAnimationFrame(monitorRafRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      discardRef.current = true;
      try { rec.stop(); } catch { /* already stopped */ }
    }
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    micAnalyserRef.current = null;
    micSamplesRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
  }

  function startMonitor() {
    cancelAnimationFrame(monitorRafRef.current);
    const loop = () => {
      if (!micEnabledRef.current || !micAnalyserRef.current || !micSamplesRef.current) return;
      if (!liveRef.current) {
        monitorRafRef.current = requestAnimationFrame(loop);
        return;
      }
      const analyser = micAnalyserRef.current;
      const samples = micSamplesRef.current;
      analyser.getByteTimeDomainData(samples);
      let squares = 0;
      for (const sample of samples) {
        const value = (sample - 128) / 128;
        squares += value * value;
      }
      const level = Math.sqrt(squares / samples.length);
      const now = performance.now();
      const threshold = Math.max(0.018, noiseFloorRef.current * 2.7);
      const rec = recorderRef.current;

      if (level > threshold) {
        lastSpeechRef.current = now;
        if (!rec) {
          startUtteranceRef.current(now);
          const audio = audioRef.current;
          if (audio && !audio.paused) audio.pause();
        }
      } else if (!rec) {
        noiseFloorRef.current = Math.min(0.018, noiseFloorRef.current * 0.985 + level * 0.015);
      } else if (now - lastSpeechRef.current > 950 && now - utteranceStartRef.current > 260) {
        rec.stop();
        settersRef.current.setDialogStatus("THINKING");
      }

      monitorRafRef.current = requestAnimationFrame(loop);
    };
    monitorRafRef.current = requestAnimationFrame(loop);
  }

  function startUtterance(now: number) {
    const stream = micRef.current;
    if (!stream || recorderRef.current || micPausedRef.current || !liveRef.current) return;
    const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
      MediaRecorder.isTypeSupported(type)
    );
    const rec = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
    recorderRef.current = rec;
    const active = rec;
    chunksRef.current = [];
    discardRef.current = false;
    utteranceStartRef.current = now;
    lastSpeechRef.current = now;
    active.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    active.onstop = () => {
      if (recorderRef.current === active) recorderRef.current = null;
      const blob = new Blob(chunksRef.current, { type: active.mimeType || "audio/webm" });
      chunksRef.current = [];
      if (!discardRef.current && blob.size > 0 && performance.now() - utteranceStartRef.current >= 260) {
        queueRef.current.push(blob);
        processQueueRef.current();
      }
      discardRef.current = false;
    };
    active.start();
    settersRef.current.setDialogStatus("LISTENING");
    settersRef.current.setStatusLine("Listening for your answer. Pause briefly when you're done.");
  }

  function processQueue() {
    if (!liveRef.current || busyRef.current || queueRef.current.length === 0) return;
    const audio = audioRef.current;
    if (audio && !audio.paused && !audio.ended) return;
    const blob = queueRef.current.shift();
    if (blob) submitRecordingRef.current(blob);
  }

  /* ── Spoken answer → Whisper transcript → next question ── */
  async function submitRecording(blob: Blob) {
    setBusy(true);
    setStatusLine("Career Sensei is listening to your answer…");
    setDialogStatus("THINKING");
    try {
      const { transcript, interviewer, audio } = await submitVoiceAnswer(
        seedRef.current,
        turnsRef.current,
        blob
      );
      commitTurns([
        ...turnsRef.current,
        { speaker: "candidate", text: transcript },
        { speaker: "interviewer", text: interviewer },
      ]);
      questionCountRef.current += 1;
      setProgress(Math.min(16 + questionCountRef.current * 17, 100));
      setAudio(audio);
      setBusy(false);
      setStatusLine("Mic is on. Speak whenever you're ready; pause briefly when you finish.");
      setDialogStatus("READY WHEN YOU ARE");
      playAudio();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not submit your answer");
      setBusy(false);
      setStatusLine("Mic is still on. Speak again whenever you're ready.");
      setDialogStatus("READY WHEN YOU ARE");
      processQueue();
    }
  }

  /* ── Begin: enable the mic, start the session ── */
  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (busyRef.current) return;
    const value = seedText.trim();
    if (!value) {
      showToast("Add a short description of the interview you want to practice");
      return;
    }
    seedRef.current = value;
    setBusy(true);
    setDialogStatus("GETTING READY");
    setSessionLabel("PREPARING YOUR SESSION");
    try {
      await enableMicrophone();
      const { interviewer, audio } = await startSenseiInterview(value);
      commitTurns([{ speaker: "interviewer", text: interviewer }]);
      questionCountRef.current = 1;
      setProgress(Math.min(16 + questionCountRef.current * 17, 100));
      setAudio(audio);
      liveRef.current = true;
      setPhase("live");
      setSessionLabel("INTERVIEW IN PROGRESS");
      setDialogStatus("READY WHEN YOU ARE");
      setStatusLine("Mic is on. Speak whenever you're ready; pause briefly when you finish.");
      setBusy(false);
      playAudio();
    } catch (err) {
      disableMicrophone(false);
      liveRef.current = false;
      setSessionLabel("YOUR PRIVATE PRACTICE");
      setDialogStatus("READY");
      setBusy(false);
      const name = err instanceof Error ? (err as Error & { name?: string }).name : "";
      showToast(
        name === "NotAllowedError"
          ? "Allow microphone access to start the interview."
          : err instanceof Error
          ? err.message
          : "Could not start the interview"
      );
    }
  }

  /* ── Pause / resume the always-on mic ── */
  async function toggleMic() {
    if (!liveRef.current) return;
    if (micEnabledRef.current) {
      disableMicrophone(true);
      setStatusLine("Microphone paused. Resume it whenever you want to answer.");
    } else {
      try {
        await enableMicrophone();
        setStatusLine("Mic is on. Speak whenever you're ready.");
      } catch (err) {
        showToast(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Allow microphone access to continue."
            : err instanceof Error
            ? err.message
            : "Microphone unavailable."
        );
      }
    }
  }

  /* ── Finish → session notes (Language/Content/Overall evaluation) ── */
  async function handleEnd() {
    if (busyRef.current || !liveRef.current) return;
    if (!turnsRef.current.some((t) => t.speaker === "candidate")) {
      showToast("Answer at least one question before finishing the interview.");
      return;
    }
    liveRef.current = false;
    disableMicrophone(false);
    queueRef.current = [];
    stopAudio();
    setBusy(true);
    setDialogStatus("WRAPPING UP");
    setStatusLine("Career Sensei is preparing your session notes…");
    try {
      const { evaluation: result } = await endSenseiInterview(seedRef.current, turnsRef.current);
      setEvaluation(result);
      setPhase("ended");
      setSessionLabel("PRACTICE COMPLETE");
      setDialogStatus("SESSION COMPLETE");
      setProgress(100);
      setStatusLine("");
      setBusy(false);
      if (!awarded) {
        setAwarded(true);
        addXp(60);
        addCoins(30);
      }
    } catch (err) {
      setBusy(false);
      liveRef.current = true;
      setDialogStatus("READY WHEN YOU ARE");
      setStatusLine("Mic is on. Speak whenever you're ready; pause briefly when you finish.");
      if (!micPausedRef.current) enableMicrophone().catch(() => {});
      showToast(err instanceof Error ? err.message : "Evaluation failed");
    }
  }

  /* ── Practice again → back to the start form ── */
  function resetSession() {
    liveRef.current = false;
    disableMicrophone(false);
    queueRef.current = [];
    stopAudio();
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (audioRef.current) audioRef.current.removeAttribute("src");
    cancelAnimationFrame(speechRafRef.current);
    stopSpeechAnimation();
    setSpeaking(false);
    setBusy(false);
    commitTurns([]);
    setEvaluation("");
    setPhase("idle");
    setProgress(0);
    questionCountRef.current = 0;
    setSessionLabel("YOUR PRIVATE PRACTICE");
    setDialogStatus("READY");
    setStatusLine("Your microphone listens for speech while the interview is active.");
    setAwarded(false);
    showToast("");
    window.clearTimeout(toastTimerRef.current);
  }

  const micLabel = micEnabled
    ? "MIC ON · SPEAK ANYTIME"
    : micPaused
    ? "MIC PAUSED"
    : "MIC OFF";

  return (
    <div className="cs-shell">
      {/* ── Topbar (original Career Sensei chrome) ── */}
      <header className="topbar">
        <Link className="brand" href="/dashboard" aria-label="Career Sensei home">
          <span className="brand-mark">CS</span>
          <span>CAREER <b>SENSEI</b></span>
        </Link>
        <div className="session-state">
          <span className="state-light" />
          <span>{sessionLabel}</span>
        </div>
      </header>

      <section className={`scene${speaking ? " speaking" : ""}`} aria-label="Career Sensei interview practice" ref={sceneRef}>
        {/* Character */}
        <div className="character-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="character"
            src="/career-sensei.png"
            alt="Career Sensei, a samurai guide accompanied by a green snake"
          />
        </div>

        {/* Dialog card */}
        <section className="dialog-card" aria-live="polite">
          <div className="card-heading">
            <div>
              <span className="tiny-mark">CS</span>
              <span className="sensei-name">CAREER SENSEI</span>
            </div>
            <span className="dialog-status">
              <i />
              <span>{dialogStatus}</span>
            </span>
          </div>

          <div className="progress-track" aria-label="Interview progress">
            <i style={{ width: `${progress}%` }} />
          </div>

          <div id="conversation" className="conversation" ref={conversationRef}>
            {turns.length === 0 ? (
              <article className="message mentor-message">
                <p>{WELCOME}</p>
              </article>
            ) : (
              turns.map((turn, idx) => (
                <article
                  key={idx}
                  className={`message ${turn.speaker === "interviewer" ? "mentor-message" : "user-message"}`}
                >
                  <span className="message-label">
                    {turn.speaker === "interviewer" ? "CAREER SENSEI" : "YOU"}
                  </span>
                  <p>{turn.text}</p>
                </article>
              ))
            )}
          </div>

          {/* ── Start form (idle) ── */}
          {phase === "idle" && (
            <form id="start-form" className="start-form" onSubmit={handleStart}>
              <label htmlFor="seed">TODAY'S PRACTICE</label>
              <div className="start-row">
                <input
                  id="seed"
                  value={seedText}
                  onChange={(e) => {
                    seedTouchedRef.current = true;
                    setSeedText(e.target.value);
                  }}
                  disabled={busy}
                />
                <button className="button button-gold" type="submit" disabled={busy}>
                  Begin <span>→</span>
                </button>
              </div>
            </form>
          )}

          {/* ── Live controls — mic is always on ── */}
          {phase === "live" && (
            <div id="controls" className="controls">
              <div className="control-status" id="status">
                {statusLine}
              </div>
              <div className="mic-row">
                <span className={`mic-indicator${micEnabled ? " active" : ""}`}>
                  <i />
                  <span>{micLabel}</span>
                </span>
                <button
                  className="button button-quiet mic-toggle"
                  type="button"
                  onClick={toggleMic}
                  disabled={busy}
                >
                  {micPaused ? "Resume mic" : "Pause mic"}
                </button>
              </div>
              <div className="control-row">
                <button
                  className="button button-quiet"
                  id="play-button"
                  type="button"
                  onClick={replayAudio}
                  disabled={busy || !audioUrlRef.current}
                >
                  ↻ Replay question
                </button>
                <button
                  className="button button-finish"
                  id="end-button"
                  type="button"
                  onClick={handleEnd}
                  disabled={busy}
                >
                  Finish
                </button>
              </div>
            </div>
          )}

          {/* ── Session notes (ended) ── */}
          {phase === "ended" && (
            <>
              <article className="evaluation">
                <span className="message-label">YOUR SESSION NOTES</span>
                <div id="evaluation-content">
                  {evaluation ? (
                    <EvaluationView markdown={evaluation} />
                  ) : (
                    <p>No evaluation was produced.</p>
                  )}
                </div>
                <p className="evaluation-award">
                  <strong>+60 XP · +30 Coins</strong> earned for this session
                </p>
              </article>
              <button
                className="button button-gold new-session"
                type="button"
                onClick={resetSession}
              >
                Practice again <span>↗</span>
              </button>
            </>
          )}
        </section>
      </section>

      {/* Interviewer voice (always mounted so the graph stays wired) */}
      <audio
        id="audio-player"
        className="hidden"
        ref={audioRef}
        onPlay={handleAudioPlay}
        onPause={handleAudioStop}
        onEnded={handleAudioStop}
      />

      <div className={`toast${toast ? "" : " hidden"}`} id="toast" role="alert">
        {toast}
      </div>
    </div>
  );
}
