import { NextResponse } from "next/server";
import { Resend } from "resend";

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

  // ── 1. Email notification (always fires first, never blocks the response) ──
  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.LEAD_NOTIFY_EMAIL;
  const resendTo = process.env.RESEND_TO_EMAIL || notifyEmail || "grudman1@gmail.com";
  console.log("[resend] env check — RESEND_API_KEY set:", !!resendKey, "| RESEND_TO_EMAIL:", process.env.RESEND_TO_EMAIL ?? "(not set)", "| effective to:", resendTo);
  if (resendKey) {
    try {
      console.log("[resend] attempting send to:", resendTo);
      const resend = new Resend(resendKey);
      const subject = `New Curbio Lead — ${payload.firstName} ${payload.lastName} — ${payload.market ?? "unknown market"}`.trim();
      const text = [
        `Name:        ${payload.name}`,
        `Email:       ${payload.email}`,
        `Phone:       ${payload.phone || "(not provided)"}`,
        `Market:      ${payload.market ?? ""}`,
        `ZIP:         ${payload.zip || ""}`,
        ``,
        `utm_source:  ${payload.utm_source ?? ""}`,
        `utm_campaign:${payload.utm_campaign ?? ""}`,
        `utm_medium:  ${payload.utm_medium ?? ""}`,
        `utm_content: ${payload.utm_content ?? ""}`,
        `utm_term:    ${payload.utm_term ?? ""}`,
        ``,
        `GA Client ID: ${payload.gaClientId ?? ""}`,
        `Submitted:   ${payload.submittedAt}`,
        `Source:      ${payload.source}`,
      ].join("\n");
      const data = await resend.emails.send({
        from: "Curbio Leads <leads@curbio.com>",
        to: resendTo,
        subject,
        text,
      });
      console.log("[resend] result:", JSON.stringify(data));
    } catch (err) {
      console.log("[resend] error:", JSON.stringify(err));
    }
  } else {
    console.log("[resend] skipped — RESEND_API_KEY not set");
  }

  // ── 2. CRM webhook (best-effort — never blocks or fails the response) ──
  const webhook = process.env.CURBIO_CRM_WEBHOOK_URL;
  if (webhook) {
    try {
      console.log("[lead] posting to CRM:", webhook, JSON.stringify(payload));
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
      } else {
        console.log("[lead] CRM ok", res.status);
      }
    } catch (err) {
      console.error("[lead] CRM webhook threw", err);
    }
  } else {
    console.log("[lead] (no CRM webhook configured) payload:", payload);
  }

  const pdf =
    payload.source === "magnet" && payload.magnet ? MAGNET_FILES[payload.magnet] ?? null : null;

  return NextResponse.json({ ok: true, pdf });
}
