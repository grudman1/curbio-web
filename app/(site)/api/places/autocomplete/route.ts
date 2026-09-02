import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ENDPOINT = "https://places.googleapis.com/v1/places:autocomplete";

export async function POST(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ suggestions: [] }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    input?: unknown;
    sessionToken?: unknown;
  } | null;
  const input = typeof body?.input === "string" ? body.input.trim().slice(0, 180) : "";
  const sessionToken = typeof body?.sessionToken === "string" ? body.sessionToken : "";
  if (input.length < 3 || !/^[a-zA-Z0-9-]{16,100}$/.test(sessionToken)) {
    return NextResponse.json({ suggestions: [] }, { status: 400 });
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
      },
      body: JSON.stringify({
        input,
        sessionToken,
        includedRegionCodes: ["us"],
        includedPrimaryTypes: ["street_address"],
      }),
      signal: AbortSignal.timeout(1800),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ suggestions: [] }, { status: 502 });

    const data = (await response.json()) as {
      suggestions?: {
        placePrediction?: { placeId?: string; text?: { text?: string } };
      }[];
    };
    const suggestions = (data.suggestions ?? []).flatMap((suggestion) => {
      const placeId = suggestion.placePrediction?.placeId;
      const label = suggestion.placePrediction?.text?.text;
      return placeId && label ? [{ placeId, label }] : [];
    });
    return NextResponse.json(
      { suggestions },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 502 });
  }
}
