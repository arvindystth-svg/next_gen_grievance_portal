import { NextRequest, NextResponse } from "next/server";
import { getSarvamApiKey, sarvamTranscribe } from "@/lib/sarvam";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB safety cap
const MAX_DURATION_SEC = 30; // Sarvam REST API limit

export async function POST(req: NextRequest) {
  try {
    const apiKey = getSarvamApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Sarvam API key not configured.", fallback: "webspeech" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio");
    const language = (formData.get("language") as string) || "en";

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: `Audio file too large. Maximum ${MAX_AUDIO_BYTES / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    const durationSec = Number(formData.get("duration") || 0);
    if (durationSec > MAX_DURATION_SEC) {
      return NextResponse.json(
        { error: `Recording too long. Sarvam REST API supports up to ${MAX_DURATION_SEC} seconds.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const result = await sarvamTranscribe(arrayBuffer, audio.type, language, apiKey);

    return NextResponse.json({
      transcript: result.transcript,
      language_code: result.language_code,
      provider: "sarvam-saaras-v3",
      request_id: result.request_id,
    });
  } catch (err) {
    console.error("transcribe error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Transcription failed.",
        fallback: "webspeech",
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  const configured = Boolean(getSarvamApiKey());
  return NextResponse.json({
    status: "ok",
    service: "Sarvam Speech-to-Text",
    configured,
    model: "saaras:v3",
    max_duration_seconds: MAX_DURATION_SEC,
  });
}
