import { NextRequest, NextResponse } from "next/server";
import { extractGeocodeQueries, resolveAreaFromText } from "@/lib/geocoding";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body.text || "").trim();
    const aiLocality = body.aiLocality as string | undefined;
    const aiWard = body.aiWard as string | undefined;

    if (!text || text.length < 5) {
      return NextResponse.json(
        { resolved: false, error: "Text too short for geocoding" },
        { status: 400 }
      );
    }

    const resolved = await resolveAreaFromText(text, { aiLocality, aiWard });
    if (!resolved) {
      return NextResponse.json({
        resolved: false,
        queriesTried: extractGeocodeQueries(text, aiLocality, aiWard),
      });
    }

    return NextResponse.json({
      resolved: true,
      ...resolved,
    });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json(
      { resolved: false, error: "Geocoding failed" },
      { status: 500 }
    );
  }
}
