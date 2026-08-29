import { NextRequest, NextResponse } from "next/server";

interface AnalysisResult {
  summary: string;
  cpgrams_category: string;
  local_department: string;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  location: {
    locality: string;
    ward: string;
    zone: string;
    latitude: number;
    longitude: number;
  };
  missing_details_advisory: {
    is_missing: boolean;
    observation: string;
    why_it_matters: string;
  };
  confidence: number;
  keywords: string[];
  suggested_actions: string[];
}

interface LocationContext {
  lat?: number;
  lng?: number;
  ward?: string;
  zone?: string;
}

const SYSTEM_PROMPT = `You are an AI grievance classifier for the Indian government's CPGRAMS (Centralised Public Grievance Redress and Monitoring System) portal, serving citizens of Bengaluru, Karnataka (BBMP, BWSSB, BESCOM).

Analyze the citizen's specific complaint text and return valid JSON with exactly this schema:

{
  "summary": "Two formal sentences in official governance English summarizing the citizen's specific problem.",
  "cpgrams_category": "Relevant Central Ministry",
  "local_department": "Responsible local body",
  "urgency": "HIGH | MEDIUM | LOW",
  "location": {
    "locality": "string",
    "ward": "string",
    "zone": "South Zone | East Zone | North Zone | West Zone | Central Zone",
    "latitude": number,
    "longitude": number
  },
  "missing_details_advisory": {
    "is_missing": boolean,
    "observation": "string",
    "why_it_matters": "string"
  },
  "confidence": number,
  "keywords": ["string"],
  "suggested_actions": ["string"]
}

Classification rules:
- Base summary, cpgrams_category, local_department, and urgency on the ACTUAL complaint (street lights, drainage, potholes, garbage, water leak, power outage, parks, noise, etc.).
- cpgrams_category examples: Ministry of Power, Ministry of Housing and Urban Affairs, Ministry of Road Transport and Highways, Ministry of Jal Shakti.
- local_department examples: BBMP Electrical, BBMP Storm Water Drains, BBMP Roads & Infrastructure, BBMP Solid Waste Management, BWSSB Water Supply, BESCOM.
- urgency HIGH for safety risks, hospital/school proximity, flooding, burst pipes, live wires; MEDIUM for service disruption; LOW for minor nuisances.
- Use provided GPS/ward hints when available; otherwise infer locality and ward from complaint text.
- missing_details_advisory.is_missing should be true when no landmark, address, or consumer ID is mentioned.
- confidence is 0–100 reflecting how clearly the complaint was understood.
- Return JSON only. No markdown or extra text.`;

/** Hardcoded water-supply mock — used only when OpenAI is unavailable or fails. */
function waterSupplyMockFallback(ctx: LocationContext): AnalysisResult {
  return {
    summary:
      "A water supply infrastructure failure has been reported in the Koramangala area. The complaint indicates a pipe burst or major leak requiring immediate BWSSB intervention to prevent water wastage and road damage.",
    cpgrams_category: "Ministry of Housing and Urban Affairs",
    local_department: "BBMP Engineering / BWSSB Water Supply",
    urgency: "HIGH",
    location: {
      locality: "Koramangala 4th Block",
      ward: ctx.ward || "Ward 151 - Koramangala",
      zone: ctx.zone || "South Zone",
      latitude: ctx.lat ?? 12.9344,
      longitude: ctx.lng ?? 77.6251,
    },
    missing_details_advisory: {
      is_missing: false,
      observation: "Landmark identified successfully.",
      why_it_matters: "Specific landmarks allow quick dispatch of maintenance vans.",
    },
    confidence: 75,
    keywords: ["water", "BWSSB", "supply"],
    suggested_actions: [
      "Dispatch BWSSB emergency repair crew",
      "Shut off main valve at junction",
      "Notify area engineer",
    ],
  };
}

function normalizeUrgency(value: unknown): "HIGH" | "MEDIUM" | "LOW" {
  const upper = String(value ?? "MEDIUM").toUpperCase();
  if (upper === "HIGH" || upper === "LOW") return upper;
  return "MEDIUM";
}

function normalizeAnalysis(
  raw: Partial<AnalysisResult>,
  ctx: LocationContext
): AnalysisResult {
  return {
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : "A civic grievance has been filed by a resident in Bengaluru. The issue requires prompt attention and field inspection by the appropriate municipal authority.",
    cpgrams_category:
      typeof raw.cpgrams_category === "string" && raw.cpgrams_category.trim()
        ? raw.cpgrams_category.trim()
        : "Ministry of Housing and Urban Affairs",
    local_department:
      typeof raw.local_department === "string" && raw.local_department.trim()
        ? raw.local_department.trim()
        : "BBMP General Services",
    urgency: normalizeUrgency(raw.urgency),
    location: {
      locality:
        raw.location?.locality?.trim() ||
        ctx.ward?.split(" - ")[1] ||
        "Bengaluru",
      ward: raw.location?.ward?.trim() || ctx.ward || "Ward to be confirmed",
      zone: raw.location?.zone?.trim() || ctx.zone || "To be confirmed",
      latitude:
        typeof raw.location?.latitude === "number"
          ? raw.location.latitude
          : ctx.lat ?? 12.9716,
      longitude:
        typeof raw.location?.longitude === "number"
          ? raw.location.longitude
          : ctx.lng ?? 77.5946,
    },
    missing_details_advisory: {
      is_missing: Boolean(raw.missing_details_advisory?.is_missing),
      observation:
        raw.missing_details_advisory?.observation?.trim() ||
        "Details reviewed for completeness.",
      why_it_matters:
        raw.missing_details_advisory?.why_it_matters?.trim() ||
        "Specific landmarks allow quick dispatch of maintenance vans.",
    },
    confidence:
      typeof raw.confidence === "number"
        ? Math.min(100, Math.max(0, Math.round(raw.confidence)))
        : 85,
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.filter((k): k is string => typeof k === "string").slice(0, 8)
      : [],
    suggested_actions: Array.isArray(raw.suggested_actions)
      ? raw.suggested_actions
          .filter((a): a is string => typeof a === "string")
          .slice(0, 5)
      : [],
  };
}

async function openAIAnalysis(
  citizenText: string,
  ctx: LocationContext,
  apiKey: string
): Promise<AnalysisResult> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const userMessage = [
    "Citizen grievance:",
    citizenText,
    "",
    "Location context from citizen device:",
    `- latitude: ${ctx.lat ?? "not provided"}`,
    `- longitude: ${ctx.lng ?? "not provided"}`,
    `- ward: ${ctx.ward ?? "not provided"}`,
    `- zone: ${ctx.zone ?? "not provided"}`,
    "",
    "Classify this specific complaint and return the JSON schema described in the system prompt.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No content from OpenAI");
  }

  const parsed = JSON.parse(content) as Partial<AnalysisResult>;
  return normalizeAnalysis(parsed, ctx);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, transcript, lat, lng, ward, zone } = body;

    const citizenText = (text || transcript || "").trim();
    if (!citizenText || citizenText.length < 5) {
      return NextResponse.json(
        { error: "Please provide a grievance description of at least 5 characters." },
        { status: 400 }
      );
    }

    const locationCtx: LocationContext = { lat, lng, ward, zone };
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    let result: AnalysisResult;
    let modelUsed: string;

    if (openaiKey) {
      try {
        result = await openAIAnalysis(citizenText, locationCtx, openaiKey);
        modelUsed = process.env.OPENAI_MODEL || "gpt-4o-mini";
      } catch (err) {
        console.error("OpenAI failed, falling back to water-supply mock:", err);
        result = waterSupplyMockFallback(locationCtx);
        modelUsed = "water-supply-mock-fallback";
      }
    } else {
      result = waterSupplyMockFallback(locationCtx);
      modelUsed = "water-supply-mock-fallback";
    }

    return NextResponse.json({
      ...result,
      processedAt: new Date().toISOString(),
      model: modelUsed,
    });
  } catch (err) {
    console.error("analyze-grievance error:", err);
    return NextResponse.json(
      { error: "Failed to analyze grievance. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  return NextResponse.json({
    status: "ok",
    service: "AI CPGRAMS Grievance Analyzer",
    version: "1.1",
    openai_configured: hasKey,
    models: hasKey
      ? [process.env.OPENAI_MODEL || "gpt-4o-mini"]
      : ["water-supply-mock-fallback (OPENAI_API_KEY not set)"],
  });
}
