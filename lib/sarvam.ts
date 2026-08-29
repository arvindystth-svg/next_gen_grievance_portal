/**
 * Sarvam AI client utilities — STT (Saaras v3) and Chat (Sarvam-105B).
 * Docs: https://docs.sarvam.ai
 */

export const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";
export const SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions";

export interface SarvamSttOptions {
  languageCode: string;
  mode: "transcribe" | "translate" | "verbatim" | "translit" | "codemix";
}

export interface SarvamTranscribeResult {
  transcript: string;
  language_code: string | null;
  request_id?: string;
}

export interface SarvamLocationExtraction {
  locality?: string | null;
  ward?: string | null;
  zone?: string | null;
  landmarks?: string[];
  confidence?: number;
}

/** Map portal language codes to Sarvam STT settings */
export const PORTAL_LANG_TO_SARVAM: Record<string, SarvamSttOptions> = {
  en: { languageCode: "en-IN", mode: "transcribe" },
  kn: { languageCode: "kn-IN", mode: "transcribe" },
  hi: { languageCode: "hi-IN", mode: "transcribe" },
  ta: { languageCode: "ta-IN", mode: "transcribe" },
  hin: { languageCode: "unknown", mode: "codemix" },
};

export function getSarvamApiKey(): string | undefined {
  return process.env.SARVAM_API_KEY?.trim() || undefined;
}

function getSarvamChatModel(): string {
  // sarvam-105b-conversations returns direct content; sarvam-105b may use reasoning_content
  return process.env.SARVAM_MODEL?.trim() || "sarvam-105b-conversations";
}

function parseSarvamChatContent(message: {
  content?: string | null;
  reasoning_content?: string | null;
}): string | null {
  if (message.content && typeof message.content === "string" && message.content.trim()) {
    return message.content.trim();
  }
  // Fallback: some models emit reasoning_content when content is null
  if (
    message.reasoning_content &&
    typeof message.reasoning_content === "string" &&
    message.reasoning_content.trim()
  ) {
    // Try to extract JSON from reasoning if present
    const jsonMatch = message.reasoning_content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];
    return message.reasoning_content.trim();
  }
  return null;
}

export async function sarvamTranscribe(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  portalLanguage: string,
  apiKey: string
): Promise<SarvamTranscribeResult> {
  const sttOpts = PORTAL_LANG_TO_SARVAM[portalLanguage] || PORTAL_LANG_TO_SARVAM.en;

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });
  formData.append("file", blob, "recording.webm");
  formData.append("model", "saaras:v3");
  formData.append("language_code", sttOpts.languageCode);
  formData.append("mode", sttOpts.mode);

  const response = await fetch(SARVAM_STT_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sarvam STT error: ${response.status} ${err}`);
  }

  const data = await response.json();
  if (!data.transcript || typeof data.transcript !== "string") {
    throw new Error("Sarvam STT returned no transcript");
  }

  return {
    transcript: data.transcript.trim(),
    language_code: data.language_code ?? null,
    request_id: data.request_id,
  };
}

export async function sarvamExtractLocation(
  citizenText: string,
  apiKey: string
): Promise<SarvamLocationExtraction | null> {
  const response = await fetch(SARVAM_CHAT_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getSarvamChatModel(),
      messages: [
        {
          role: "system",
          content: `You extract Bengaluru (BBMP) location entities from citizen grievance text in any Indian language or English.
Return valid JSON only:
{
  "locality": "neighbourhood name or null",
  "ward": "e.g. Ward 151 - Koramangala or null",
  "zone": "South Zone | East Zone | North Zone | West Zone | Central Zone or null",
  "landmarks": ["nearby landmark strings"],
  "confidence": 0-100
}
Infer ward/zone from known Bengaluru areas when possible.`,
        },
        {
          role: "user",
          content: citizenText,
        },
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sarvam location extraction error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = parseSarvamChatContent(data.choices?.[0]?.message ?? {});
  if (!content) return null;

  return JSON.parse(content) as SarvamLocationExtraction;
}

export async function sarvamAnalyzeGrievance(
  citizenText: string,
  locationContext: {
    lat?: number;
    lng?: number;
    ward?: string;
    zone?: string;
    locality?: string;
  },
  systemPrompt: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const userMessage = [
    "Citizen grievance:",
    citizenText,
    "",
    "Location context:",
    `- latitude: ${locationContext.lat ?? "not provided"}`,
    `- longitude: ${locationContext.lng ?? "not provided"}`,
    `- ward: ${locationContext.ward ?? "not provided"}`,
    `- zone: ${locationContext.zone ?? "not provided"}`,
    `- locality: ${locationContext.locality ?? "not provided"}`,
    "",
    "Classify this specific complaint and return the JSON schema from the system prompt.",
  ].join("\n");

  const response = await fetch(SARVAM_CHAT_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getSarvamChatModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sarvam analysis error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = parseSarvamChatContent(data.choices?.[0]?.message ?? {});
  if (!content) {
    throw new Error("No content from Sarvam");
  }

  return JSON.parse(content) as Record<string, unknown>;
}
