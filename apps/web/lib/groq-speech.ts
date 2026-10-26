/* ═══════════════════════════════════════════
   SERVER-ONLY GROQ SPEECH HELPERS
   TypeScript port of raulf-the-recruiter's
   groq_tts.py + groq_stt.py — Orpheus TTS
   (voice "troy", 200-char chunks, WAV join)
   and Whisper transcription.
   Import ONLY from route handlers.
   ═══════════════════════════════════════════ */

const TTS_URL = "https://api.groq.com/openai/v1/audio/speech";
const STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export const TTS_MODEL = "canopylabs/orpheus-v1-english";
export const TTS_VOICE = "troy";
export const STT_MODEL = "whisper-large-v3-turbo";

const MAX_INPUT_CHARACTERS = 200;

/** Split long text at sentence-ish boundaries so each TTS call stays within limits. */
export function splitForTts(text: string, limit: number = MAX_INPUT_CHARACTERS): string[] {
  let remaining = text.trim();
  const chunks: string[] = [];
  while (remaining) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }
    let splitAt = Math.max(
      ...[". ", "? ", "! ", "; ", ", ", " "].map((mark) => remaining.lastIndexOf(mark, limit))
    );
    if (splitAt <= 0) splitAt = limit;
    else splitAt += 1;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  return chunks.length ? chunks : [""];
}

/**
 * Groq may use 0xffffffff as the unknown RIFF/data length sentinel;
 * patch the header so standard WAV parsers accept the segment.
 */
function normalizeWavHeader(data: Buffer): Buffer {
  if (data.length < 12 || data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Groq returned an invalid WAV audio segment");
  }
  const normalized = Buffer.from(data);
  normalized.writeUInt32LE(normalized.length - 8, 4);
  let offset = 12;
  while (offset + 8 <= normalized.length) {
    const chunkName = normalized.toString("ascii", offset, offset + 4);
    const chunkSize = normalized.readUInt32LE(offset + 4);
    if (chunkName === "data") {
      normalized.writeUInt32LE(normalized.length - offset - 8, offset + 4);
      return normalized;
    }
    offset += 8 + chunkSize + (chunkSize & 1);
  }
  throw new Error("Groq WAV response did not include an audio data chunk");
}

/** Concatenate same-format WAV segments into one file (port of _join_wav_files). */
export function joinWavFiles(files: Buffer[]): Buffer {
  if (files.length === 0) throw new Error("No WAV audio to join");
  if (files.length === 1) return normalizeWavHeader(files[0]);

  let channels = 0;
  let sampleRate = 0;
  let sampleWidth = 0;
  const bodies: Buffer[] = [];

  for (const raw of files) {
    const data = normalizeWavHeader(raw);
    let offset = 12;
    let fmtChannels = 0;
    let fmtSampleRate = 0;
    let fmtSampleWidth = 0;
    let body: Buffer | null = null;

    while (offset + 8 <= data.length) {
      const name = data.toString("ascii", offset, offset + 4);
      const size = data.readUInt32LE(offset + 4);
      if (name === "fmt ") {
        fmtChannels = data.readUInt16LE(offset + 10);
        fmtSampleRate = data.readUInt32LE(offset + 12);
        fmtSampleWidth = data.readUInt16LE(offset + 22);
      } else if (name === "data") {
        body = data.subarray(offset + 8, offset + 8 + size);
      }
      offset += 8 + size + (size & 1);
    }

    if (!body || !fmtChannels || !fmtSampleWidth) throw new Error("Groq returned a malformed WAV segment");
    if (channels === 0) {
      channels = fmtChannels;
      sampleRate = fmtSampleRate;
      sampleWidth = fmtSampleWidth;
    } else if (fmtChannels !== channels || fmtSampleRate !== sampleRate || fmtSampleWidth !== sampleWidth) {
      throw new Error("Groq returned incompatible WAV audio segments");
    }
    bodies.push(body);
  }

  const pcm = Buffer.concat(bodies);
  const out = Buffer.alloc(44 + pcm.length);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + pcm.length, 4);
  out.write("WAVE", 8, "ascii");
  out.write("fmt ", 12, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(channels, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * channels * sampleWidth, 28);
  out.writeUInt16LE(channels * sampleWidth, 32);
  out.writeUInt16LE(sampleWidth * 8, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(pcm.length, 40);
  pcm.copy(out, 44);
  return out;
}

/**
 * Synthesize speech to WAV. Returns null (never throws) when speech is
 * unavailable so the interview still works in text-only mode.
 */
export async function synthesizeSpeech(apiKey: string, text: string): Promise<Buffer | null> {
  try {
    const chunks = splitForTts(text);
    const wavs: Buffer[] = [];
    for (const chunk of chunks) {
      const res = await fetch(TTS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: TTS_MODEL, voice: TTS_VOICE, input: chunk, response_format: "wav" }),
      });
      if (!res.ok) {
        console.warn(`TTS unavailable (HTTP ${res.status}) — continuing without audio`);
        return null;
      }
      wavs.push(Buffer.from(await res.arrayBuffer()));
    }
    return joinWavFiles(wavs);
  } catch (err) {
    console.warn("TTS unavailable:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Transcribe a browser recording with Whisper (port of groq_stt.py). */
export async function transcribeAudio(
  apiKey: string,
  audio: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([audio as unknown as BlobPart], { type: contentType }), filename);
  form.append("model", STT_MODEL);
  form.append("response_format", "text");

  const res = await fetch(STT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Groq transcription returned HTTP ${res.status}`);
  return (await res.text()).trim();
}
