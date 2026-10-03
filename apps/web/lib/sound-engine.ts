"use client";

/* ═══════════════════════════════════════════════════════════
   GAME SOUND ENGINE — v3 (clean & effective) 🔊
   • Rebuilt reverb: NO feedback loops → zero continuous drone
   • Every sound is finite, one-shot, and < 1s except fanfares
   • Design per spec: ding <0.5s, thud <0.5s, rising combo,
     2s session fanfare, 3s level-up fanfare
   • Persisted mute toggle in localStorage
   ═══════════════════════════════════════════════════════════ */

type SoundName =
  | "correct"
  | "wrong"
  | "combo"
  | "sessionComplete"
  | "xpMilestone"
  | "streakMilestone"
  | "unlock"
  | "click"
  | "hover"
  | "heartLost"
  | "coin"
  | "levelUp"
  | "transition"
  | "notification"
  | "victory"
  | "defeat"
  | "tick"
  | "tickUrgent"
  | "timeUp";

const STORAGE_KEY = "cv_sound_enabled";

let ctx: AudioContext | null = null;
let muted: boolean | null = null;
let master: GainNode | null = null;
let verbIn: GainNode | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
      buildReverb();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/* ── Reverb: simple ONE-PASS diffusion network.
      No feedback paths at all → a sound can never loop forever.
      Tail ≈ 0.55s, fully silent afterwards. ── */
function buildReverb() {
  if (!ctx || !master) return;
  verbIn = ctx.createGain();

  const wet = ctx.createGain();
  wet.gain.value = 0.4;
  verbIn.connect(wet);
  wet.connect(master);

  // Feed-forward taps only (no loops)
  const taps: [number, number, number][] = [
    // [delaySec, gain, lowpassHz]
    [0.017, 0.5, 5000],
    [0.029, 0.4, 4200],
    [0.047, 0.32, 3400],
    [0.071, 0.26, 2600],
    [0.097, 0.2, 2000],
    [0.131, 0.15, 1500],
  ];
  taps.forEach(([d, g, lpHz], i) => {
    const delay = ctx!.createDelay(0.2);
    delay.delayTime.value = d;
    const tapGain = ctx!.createGain();
    tapGain.gain.value = g;
    const lp = ctx!.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lpHz;
    const pan = ctx!.createStereoPanner();
    pan.pan.value = i % 2 === 0 ? -0.4 : 0.4;
    verbIn!.connect(delay);
    delay.connect(lp);
    lp.connect(tapGain);
    tapGain.connect(pan);
    pan.connect(wet);
  });
}

function wet(amount = 0.25): GainNode {
  const send = ctx!.createGain();
  send.gain.value = amount;
  send.connect(verbIn!);
  return send;
}

export function isSoundEnabled(): boolean {
  if (muted === null && typeof window !== "undefined") {
    muted = localStorage.getItem(STORAGE_KEY) !== "off";
  }
  return muted !== false;
}

export function setSoundEnabled(enabled: boolean) {
  muted = enabled;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  }
}

/* ═══════════════════ VOICES (all one-shot, finite) ═══════════════════ */

interface ToneOpts {
  freq: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  pan?: number;
  verb?: number;
}

function tone(c: AudioContext, o: ToneOpts) {
  const t0 = c.currentTime + o.start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type || "sine";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t0 + o.dur);

  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(o.gain ?? 0.12, t0 + 0.008);
  // Hard stop: gain hits exact 0 at the end → guaranteed silence
  g.gain.setValueAtTime((o.gain ?? 0.12) * 0.3, t0 + o.dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t0 + o.dur);

  const panner = c.createStereoPanner();
  panner.pan.value = o.pan ?? 0;
  osc.connect(g);
  g.connect(panner);
  panner.connect(master!);
  if (o.verb) g.connect(wet(o.verb));

  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

/** FM bell — bright attack, pure finite tail */
function bell(c: AudioContext, freq: number, start: number, dur: number, gain = 0.09, pan = 0) {
  const t0 = c.currentTime + start;
  const carrier = c.createOscillator();
  carrier.frequency.value = freq;
  const mod = c.createOscillator();
  mod.frequency.value = freq * 2.01;
  const modGain = c.createGain();
  modGain.gain.setValueAtTime(freq * 1.2, t0);
  modGain.gain.exponentialRampToValueAtTime(1, t0 + dur * 0.4);

  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  g.gain.setValueAtTime(gain * 0.25, t0 + dur * 0.6);
  g.gain.linearRampToValueAtTime(0, t0 + dur);

  const panner = c.createStereoPanner();
  panner.pan.value = pan;
  mod.connect(modGain).connect(carrier.frequency);
  carrier.connect(g).connect(panner);
  panner.connect(master!);
  g.connect(wet(0.35));

  mod.start(t0);
  carrier.start(t0);
  mod.stop(t0 + dur + 0.02);
  carrier.stop(t0 + dur + 0.02);
}

/** Soft warm pad chord — slow bloom, guaranteed fade-out */
function pad(c: AudioContext, freqs: number[], start: number, dur: number, gain = 0.03) {
  const t0 = c.currentTime + start;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(400, t0);
  lp.frequency.linearRampToValueAtTime(2000, t0 + dur * 0.3);
  lp.frequency.linearRampToValueAtTime(400, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.3);
  g.gain.linearRampToValueAtTime(0, t0 + dur); // hard fade to zero

  freqs.forEach((f) => {
    const osc = c.createOscillator();
    osc.type = "triangle"; // softer than saw
    osc.frequency.value = f;
    osc.detune.value = (Math.random() - 0.5) * 8;
    osc.connect(lp);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  });
  lp.connect(g);
  g.connect(master!);
  g.connect(wet(0.5));
}

/** Filtered noise burst — finite by construction (buffer ends) */
function noise(c: AudioContext, start: number, dur: number, gain = 0.06, lpHz?: number) {
  const t0 = c.currentTime + start;
  const bufSize = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  let node: AudioNode = src;
  if (lpHz) {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lpHz;
    src.connect(lp);
    node = lp;
  }
  node.connect(g).connect(master!);
  if (lpHz) g.connect(wet(0.15));
  src.start(t0);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ═══════════════════ THE COMPOSITIONS (per spec) ═══════════════════ */

export function playSound(name: SoundName, intensity = 0) {
  if (!isSoundEnabled()) return;
  const c = ensureCtx();
  if (!c || !master) return;

  switch (name) {
    case "correct": {
      // ✅ Short ding < 0.5s — pleasant two-note major blip + subtle sparkle
      const root = pick([523.25, 587.33, 659.25]);
      tone(c, { freq: root, start: 0, dur: 0.12, gain: 0.1, pan: -0.2 });
      tone(c, { freq: root * 1.5, start: 0.09, dur: 0.28, gain: 0.09, pan: 0.2, verb: 0.3 });
      break;
    }
    case "wrong": {
      // ❌ Soft thud < 0.5s — warm low knock, never harsh
      tone(c, { freq: 170, start: 0, dur: 0.22, type: "triangle", gain: 0.1, slideTo: 105 });
      tone(c, { freq: 85, start: 0, dur: 0.28, gain: 0.11, slideTo: 55 });
      noise(c, 0, 0.06, 0.02, 700);
      break;
    }
    case "combo": {
      // 🔥 Rising pitch with combo count (spec: combo 3+ → rising pitch)
      const step = Math.min(intensity - 2, 8);
      const root = 523.25 * Math.pow(1.0595, Math.max(0, step) * 2);
      tone(c, { freq: root, start: 0, dur: 0.09, gain: 0.075, pan: -0.35 });
      tone(c, { freq: root * 1.25, start: 0.07, dur: 0.09, gain: 0.075, pan: 0.35 });
      tone(c, { freq: root * 1.5, start: 0.14, dur: 0.22, gain: 0.07, verb: 0.3 });
      break;
    }
    case "sessionComplete": {
      // 🎉 2s fanfare — bright ascending arpeggio + warm major bed
      pad(c, [261.63, 329.63, 392], 0, 2.0, 0.028);
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) =>
        tone(c, { freq: f, start: i * 0.11, dur: i === notes.length - 1 ? 0.9 : 0.18, type: "triangle", gain: 0.09, pan: i % 2 ? 0.3 : -0.3, verb: 0.4 })
      );
      bell(c, 1567.98, 0.5, 1.0, 0.04);
      break;
    }
    case "victory": {
      // 🏆 Milestone fanfare (slightly bigger than sessionComplete)
      pad(c, [261.63, 329.63, 392, 523.25], 0, 2.4, 0.03);
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        bell(c, f, i * 0.13, 0.8, 0.07, i % 2 ? 0.35 : -0.35)
      );
      noise(c, 0.2, 0.5, 0.012, 6500);
      break;
    }
    case "levelUp": {
      // 🎺 3s fanfare — chromatic charge → triumphant chord bloom
      const charge = [392, 415.3, 440, 466.16, 493.88];
      charge.forEach((f, i) => tone(c, { freq: f, start: i * 0.06, dur: 0.07, type: "square", gain: 0.03 }));
      pad(c, [392, 493.88, 587.33], 0.35, 2.4, 0.032);
      [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) =>
        bell(c, f, 0.45 + i * 0.16, 1.2, 0.07, i % 2 ? 0.3 : -0.3)
      );
      break;
    }
    case "defeat": {
      // Gentle minor sigh, soft and encouraging
      pad(c, [220, 261.63, 329.63], 0, 1.4, 0.026);
      tone(c, { freq: 329.63, start: 0.1, dur: 0.6, gain: 0.05, pan: -0.2 });
      tone(c, { freq: 277.18, start: 0.45, dur: 0.8, gain: 0.045, pan: 0.2, verb: 0.4 });
      break;
    }
    case "xpMilestone": {
      // Coin shower sparkle
      [1318.5, 1567.98, 2093].forEach((f, i) =>
        bell(c, f, i * 0.05, 0.3, 0.04, i % 2 ? 0.5 : -0.5)
      );
      break;
    }
    case "coin": {
      // Two-note coin blip
      tone(c, { freq: 987.77, start: 0, dur: 0.07, gain: 0.05, pan: 0.3 });
      tone(c, { freq: 1318.5, start: 0.06, dur: 0.25, gain: 0.045, pan: -0.3 });
      break;
    }
    case "streakMilestone": {
      // Escalating chime — bigger with streak size
      const big = intensity >= 30;
      bell(c, 659.25, 0, 0.35, 0.065, -0.3);
      bell(c, 880, 0.12, 0.35, 0.065, 0.3);
      bell(c, 1318.5, 0.24, big ? 1.3 : 0.5, 0.075, 0);
      if (big) {
        pad(c, [523.25, 659.25, 783.99], 0.4, 1.6, 0.026);
        bell(c, 1567.98, 0.55, 1.0, 0.05);
      }
      break;
    }
    case "unlock": {
      // Latch clack → rising harmonic shimmer
      tone(c, { freq: 140, start: 0, dur: 0.1, type: "triangle", gain: 0.11, slideTo: 90 });
      noise(c, 0, 0.05, 0.03, 1400);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        bell(c, f, 0.15 + i * 0.06, 0.6, 0.045, (i - 1.5) * 0.22)
      );
      break;
    }
    case "notification": {
      // Two-tone mentor knock
      bell(c, 880, 0, 0.22, 0.05, 0.25);
      bell(c, 1108.73, 0.11, 0.3, 0.045, -0.25);
      break;
    }
    case "click": {
      // Rounded tick
      tone(c, { freq: 880, start: 0, dur: 0.04, gain: 0.045 });
      noise(c, 0, 0.015, 0.01, 4000);
      break;
    }
    case "hover": {
      // Feather-light, very quiet
      tone(c, { freq: 1320, start: 0, dur: 0.02, gain: 0.014 });
      break;
    }
    case "heartLost": {
      // Heartbeat double-thump, soft
      tone(c, { freq: 98, start: 0, dur: 0.09, gain: 0.12 });
      tone(c, { freq: 82, start: 0.15, dur: 0.12, gain: 0.1 });
      break;
    }
    case "transition": {
      // Very subtle page swoosh (kept quiet to avoid irritation)
      noise(c, 0, 0.22, 0.014, 2600);
      break;
    }
    case "tick": {
      // Timer tick — soft woodblock
      tone(c, { freq: 1100, start: 0, dur: 0.03, gain: 0.035, type: "triangle" });
      break;
    }
    case "tickUrgent": {
      // Urgent tick — higher, slightly louder
      tone(c, { freq: 1600, start: 0, dur: 0.035, gain: 0.05, type: "triangle" });
      tone(c, { freq: 800, start: 0.001, dur: 0.03, gain: 0.03 });
      break;
    }
    case "timeUp": {
      // Buzzer-ish but soft: two descending minor tones
      tone(c, { freq: 392, start: 0, dur: 0.18, type: "triangle", gain: 0.08 });
      tone(c, { freq: 311.13, start: 0.18, dur: 0.3, type: "triangle", gain: 0.08, verb: 0.3 });
      break;
    }
  }
}
