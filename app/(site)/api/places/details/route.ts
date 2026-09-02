import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: "Address lookup unavailable." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    placeId?: unknown;
    sessionToken?: unknown;
  } | null;
  const placeId = typeof body?.placeId === "string" ? body.placeId.trim().slice(0, 512) : "";
  const sessionToken = typeof body?.sessionToken === "string" ? body.sessionToken : "";
  if (!placeId || !/^[a-zA-Z0-9-]{16,100}$/.test(sessionToken)) {
    return NextResponse.json({ error: "Invalid address selection." }, { status: 400 });
  }

  try {
    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
    url.searchParams.set("sessionToken", sessionToken);
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "id,formattedAddress,addressComponents",
      },
      signal: AbortSignal.timeout(1800),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Address lookup unavailable." }, { status: 502 });
    }

    const place = (await response.json()) as {
      formattedAddress?: string;
      addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
    };
    const postal = place.addressComponents?.find((part) => part.types?.includes("postal_code"));
    return NextResponse.json(
      {
        formattedAddress: place.formattedAddress ?? null,
        zip: postal?.shortText ?? postal?.longText ?? null,
      },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Address lookup unavailable." }, { status: 502 });
  }
}
