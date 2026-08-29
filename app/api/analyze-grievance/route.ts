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

// Keyword-based heuristic for when OpenAI key is absent
function heuristicAnalysis(
  text: string,
  lat?: number,
  lng?: number,
  ward?: string,
  zone?: string
): AnalysisResult {
  const lower = text.toLowerCase();

  // Category detection
  let cpgrams_category = "Ministry of Housing and Urban Affairs";
  let local_department = "BBMP General Services";
  let urgency: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  let keywords: string[] = [];
  let suggested_actions: string[] = [];

  if (
    lower.includes("water") ||
    lower.includes("pipe") ||
    lower.includes("leak") ||
    lower.includes("burst") ||
    lower.includes("bwssb")
  ) {
    local_department = "BWSSB Water Supply";
    cpgrams_category = "Ministry of Housing and Urban Affairs";
    keywords = ["water", "pipe", "leak", "BWSSB"];
    urgency = lower.includes("burst") || lower.includes("flood") ? "HIGH" : "MEDIUM";
    suggested_actions = [
      "BWSSB emergency team dispatch",
      "Shut off main valve at junction",
      "Notify area engineer",
    ];
  } else if (
    lower.includes("pothole") ||
    lower.includes("road") ||
    lower.includes("road condition") ||
    lower.includes("tar") ||
    lower.includes("asphalt")
  ) {
    local_department = "BBMP Roads & Infrastructure";
    cpgrams_category = "Ministry of Road Transport and Highways";
    keywords = ["pothole", "road", "BBMP", "infrastructure"];
    urgency = lower.includes("hospital") || lower.includes("school") ? "HIGH" : "MEDIUM";
    suggested_actions = [
      "Road maintenance crew dispatch",
      "Pothole patching on priority basis",
      "Temporary signage placement",
    ];
  } else if (
    lower.includes("garbage") ||
    lower.includes("waste") ||
    lower.includes("sanitation") ||
    lower.includes("dump") ||
    lower.includes("litter")
  ) {
    local_department = "BBMP Solid Waste Management";
    cpgrams_category = "Ministry of Housing and Urban Affairs";
    keywords = ["garbage", "waste", "sanitation", "BBMP"];
    urgency = lower.includes("hospital") || lower.includes("school") ? "HIGH" : "MEDIUM";
    suggested_actions = [
      "Schedule emergency garbage pickup",
      "Clean and sanitize the blackspot",
      "Place covered waste bins at location",
    ];
  } else if (
    lower.includes("streetlight") ||
    lower.includes("light") ||
    lower.includes("electricity") ||
    lower.includes("power") ||
    lower.includes("bescom")
  ) {
    local_department = "BESCOM Electrical Infrastructure";
    cpgrams_category = "Ministry of Power";
    keywords = ["streetlight", "electricity", "BESCOM"];
    urgency = lower.includes("dark") || lower.includes("safety") ? "HIGH" : "LOW";
    suggested_actions = [
      "BESCOM field inspection",
      "Streetlight replacement/repair",
      "Fault logging in BESCOM system",
    ];
  } else if (
    lower.includes("drain") ||
    lower.includes("flood") ||
    lower.includes("stormwater") ||
    lower.includes("sewage")
  ) {
    local_department = "BBMP Stormwater Drains";
    cpgrams_category = "Ministry of Jal Shakti";
    keywords = ["drain", "flood", "stormwater"];
    urgency = lower.includes("flood") ? "HIGH" : "MEDIUM";
    suggested_actions = [
      "Drain desilting on urgent basis",
      "Sewage inspection by BWSSB",
      "Flooding risk assessment",
    ];
  }

  // Location inference from text
  let inferredLocality = ward ? ward.split(" - ")[1] || "Bengaluru" : "Bengaluru";
  const locationKeywords = [
    "koramangala", "bellandur", "indiranagar", "jayanagar", "hebbal",
    "domlur", "whitefield", "marathahalli", "electronic city", "rajajinagar",
    "malleswaram", "yeshwanthpur", "banashankari", "jp nagar", "btm layout",
  ];
  for (const loc of locationKeywords) {
    if (lower.includes(loc)) {
      inferredLocality = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  // Missing details check
  const hasLandmark =
    lower.includes("near") ||
    lower.includes("opposite") ||
    lower.includes("beside") ||
    lower.includes("outside") ||
    lower.includes("hospital") ||
    lower.includes("school") ||
    lower.includes("metro") ||
    lower.includes("station");
  
  const hasId =
    lower.includes("connection") ||
    lower.includes("consumer") ||
    lower.includes("account") ||
    lower.includes("number");

  const isMissing = !hasLandmark && !hasId;

  // Build summary
  const locationPhrase = inferredLocality
    ? `in ${inferredLocality}, ${ward || "Bengaluru"}`
    : "in Bengaluru";

  let summary = "";
  if (lower.includes("water") || lower.includes("pipe") || lower.includes("leak")) {
    summary = `A water supply infrastructure failure has been reported ${locationPhrase}. The complaint indicates a ${lower.includes("burst") ? "pipe burst" : "water leak"} requiring immediate BWSSB intervention to prevent water wastage and road damage.`;
  } else if (lower.includes("pothole") || lower.includes("road")) {
    summary = `Road infrastructure damage in the form of ${lower.includes("pothole") ? "potholes" : "damaged road surface"} has been reported ${locationPhrase}. BBMP Roads & Infrastructure division is required to conduct emergency road repairs at the identified stretch.`;
  } else if (lower.includes("garbage") || lower.includes("waste")) {
    summary = `Uncleared solid waste accumulation constituting a public health hazard has been identified ${locationPhrase}. BBMP Solid Waste Management is required to dispatch collection personnel and sanitize the affected area on a priority basis.`;
  } else {
    summary = `A civic grievance concerning ${local_department} has been filed by a resident ${locationPhrase}. The issue requires prompt attention and field inspection by the appropriate municipal authority.`;
  }

  return {
    summary,
    cpgrams_category,
    local_department,
    urgency,
    location: {
      locality: inferredLocality,
      ward: ward || "Ward to be confirmed",
      zone: zone || "To be confirmed",
      latitude: lat || 12.9716,
      longitude: lng || 77.5946,
    },
    missing_details_advisory: {
      is_missing: isMissing,
      observation: isMissing
        ? "No specific landmark or consumer ID detected in the complaint."
        : "Location landmark identified successfully.",
      why_it_matters: isMissing
        ? "Specific landmarks allow quick dispatch of maintenance vans without additional field surveys."
        : "The complaint contains sufficient location detail for field crew dispatch.",
    },
    confidence: isMissing ? 72 : 91,
    keywords,
    suggested_actions,
  };
}

async function openAIAnalysis(
  text: string,
  lat?: number,
  lng?: number,
  ward?: string,
  zone?: string,
  apiKey?: string
): Promise<AnalysisResult> {
  const prompt = `You are an AI assistant for the Indian government's CPGRAMS (Centralised Public Grievance Redress and Monitoring System) portal, specifically for BBMP (Bruhat Bengaluru Mahanagara Palike) and municipal services in Bengaluru, Karnataka.

Analyze the following citizen grievance and return a JSON object with exactly this structure:

{
  "summary": "Formal 2-sentence summary of the grievance in official governance English.",
  "cpgrams_category": "Ministry of Housing and Urban Affairs",
  "local_department": "BBMP Engineering / BWSSB Water Supply",
  "urgency": "HIGH",
  "location": {
    "locality": "Koramangala 4th Block",
    "ward": "Ward 151 - Koramangala",
    "zone": "South Zone",
    "latitude": ${lat || 12.9716},
    "longitude": ${lng || 77.5946}
  },
  "missing_details_advisory": {
    "is_missing": false,
    "observation": "Landmark identified successfully.",
    "why_it_matters": "Specific landmarks allow quick dispatch of maintenance vans."
  },
  "confidence": 92,
  "keywords": ["water", "leak", "Koramangala"],
  "suggested_actions": ["Dispatch BWSSB repair crew", "Shut main valve at junction"]
}

Rules:
- urgency must be HIGH, MEDIUM, or LOW
- local_department should reference BBMP, BWSSB, BESCOM, or other Bengaluru agencies
- summary must be exactly 2 formal sentences suitable for a government grievance portal
- Return ONLY the JSON, no other text

Grievance text: "${text}"
Current location: lat=${lat || "unknown"}, lng=${lng || "unknown"}, ward="${ward || "unknown"}", zone="${zone || "unknown"}"`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from OpenAI");
  return JSON.parse(content) as AnalysisResult;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, lat, lng, ward, zone, audioTranscript } = body;

    const inputText = (text || audioTranscript || "").trim();
    if (!inputText || inputText.length < 5) {
      return NextResponse.json(
        { error: "Please provide a grievance description of at least 5 characters." },
        { status: 400 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    let result: AnalysisResult;

    if (openaiKey) {
      try {
        result = await openAIAnalysis(inputText, lat, lng, ward, zone, openaiKey);
      } catch (err) {
        console.error("OpenAI failed, falling back to heuristic:", err);
        result = heuristicAnalysis(inputText, lat, lng, ward, zone);
      }
    } else {
      // No API key — use fast local heuristic
      result = heuristicAnalysis(inputText, lat, lng, ward, zone);
    }

    return NextResponse.json({
      ...result,
      processedAt: new Date().toISOString(),
      model: openaiKey ? "gpt-4o-mini" : "local-heuristic",
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
  return NextResponse.json({
    status: "ok",
    service: "AI CPGRAMS Grievance Analyzer",
    version: "1.0",
    models: ["gpt-4o-mini (if OPENAI_API_KEY set)", "local-heuristic (fallback)"],
  });
}
