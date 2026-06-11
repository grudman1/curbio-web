import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LeadBody = {
  name?: string;
  firstName?: string;
  phone?: string;
  zip?: string;
  email?: string;
  description?: string;
  market?: string | null;
  source?: string; // "quote" | "magnet" | "closer" | "waitlist" | campaign slugs (e.g. "email-campaign-atlanta")
  variant?: string; // A/B variant (cta-copy: "control" | "treatment")
  magnet?: "checklist" | "spring-listings" | "resource-kit" | null;
  submittedAt?: string;
  // Forwarded from Vercel geo headers. Shows WHERE demand is for expansion planning.
  detectedCity?: string;
  detectedRegion?: string;
  // GA4 client id — stable join key for future lead → closed-job reporting.
  gaClientId?: string | null;
  // Campaign attribution captured client-side before the URL strip.
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

const MAGNET_FILES: Record<string, string> = {
  checklist: "/downloads/pre-sale-checklist.pdf",
  "spring-listings": "/downloads/spring-listings-guide.pdf",
  "resource-kit": "/downloads/agent-resource-kit.pdf",
};

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  let body: LeadBody;
  try {
    body = (await req.json()) as LeadBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const errors: string[] = [];
  if (!body.name?.trim()) errors.push("name");
  if (!body.email || !isValidEmail(body.email)) errors.push("email");
  // Quote requests collect a phone; magnet/other sources don't.
  if (body.source === "quote" && (!body.phone || body.phone.replace(/\D/g, "").length < 10)) {
    errors.push("phone");
  }
  if (errors.length) {
    return NextResponse.json(
      { ok: false, error: `Missing or invalid: ${errors.join(", ")}` },
      { status: 400 }
    );
  }

  const nameParts = body.name!.trim().split(/\s+/);
  const firstName = body.firstName?.trim() || nameParts[0];
  const lastName = nameParts.slice(1).join(" "); // empty string for single-word names

  const payload = {
    name: body.name!.trim(),
    firstName,
    lastName,
    phone: body.phone?.trim() ?? "",
    email: body.email!.trim(),
    zip: body.zip ? body.zip.replace(/\D/g, "").slice(0, 5) : "",
    description: body.description?.trim() ?? "",
    market: body.market ?? null,
    source: body.source ?? "quote",
    variant: body.variant ?? null,
    magnet: body.magnet ?? null,
    submittedAt: body.submittedAt ?? new Date().toISOString(),
    detectedCity: body.detectedCity?.trim() ?? "",
    detectedRegion: body.detectedRegion?.trim() ?? "",
    gaClientId: body.gaClientId ?? null,
    utm_source: body.utm_source ?? null,
    utm_medium: body.utm_medium ?? null,
    utm_campaign: body.utm_campaign ?? null,
    utm_content: body.utm_content ?? null,
    utm_term: body.utm_term ?? null,
  };

  const webhook = process.env.CURBIO_CRM_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.CURBIO_CRM_API_KEY
            ? { authorization: `Bearer ${process.env.CURBIO_CRM_API_KEY}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("[lead] CRM webhook failed", res.status, await res.text().catch(() => ""));
        return NextResponse.json(
          { ok: false, error: "We couldn't reach our team. Please try again." },
          { status: 502 }
        );
      }
    } catch (err) {
      console.error("[lead] CRM webhook threw", err);
      return NextResponse.json(
        { ok: false, error: "We couldn't reach our team. Please try again." },
        { status: 502 }
      );
    }
  } else {
    // No CRM configured yet — log and accept so the page works end-to-end.
    console.log("[lead] (no CRM webhook configured) payload:", payload);
  }

  const pdf =
    payload.source === "magnet" && payload.magnet ? MAGNET_FILES[payload.magnet] ?? null : null;

  return NextResponse.json({ ok: true, pdf });
}
