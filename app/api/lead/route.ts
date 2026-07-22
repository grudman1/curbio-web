import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { deriveChannel } from "@/lib/channels";

export const runtime = "nodejs";

type LeadBody = {
  name?: string;
  phone?: string;
  zip?: string;
  address?: string;
  email?: string;
  description?: string;
  market?: string | null;
  crmMarketName?: string | null;
  source?: string; // "quote" | "magnet" | "closer" | "waitlist" | campaign slugs (e.g. "email-campaign-atlanta")
  variant?: string; // A/B variant (cta-copy: "control" | "treatment")
  magnet?: "checklist" | "spring-listings" | "resource-kit" | null;
  submittedAt?: string;
  // Attribution model (Curbio Attribution System spec).
  entryPoint?: string;
  medium?: string | null;
  firstTouchChannel?: string | null;
  firstTouchCampaign?: string | null;
  // Forwarded from Vercel geo headers. Shows WHERE demand is for expansion planning.
  detectedCity?: string;
  detectedRegion?: string;
  // Campaign attribution captured client-side before the URL strip.
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  // Partner attribution. Passed through verbatim — never normalised (e.g. "eXp realty" space + casing are load-bearing for CRM comparability).
  referralSourceId?: string;
  // Spam tripwires — honeypot field (humans never see it) and the client-side
  // form-render timestamp. See the checks at the top of POST.
  company?: string;
  renderedAt?: number | string;
};

const MAGNET_FILES: Record<string, string> = {
  checklist: "/downloads/pre-sale-checklist.pdf",
  "spring-listings": "/downloads/spring-listings-guide.pdf",
  "resource-kit": "/downloads/agent-resource-kit.pdf",
};

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const SLUG_TO_CRM_MARKET: Record<string, string> = {
  "atlanta": "Atlanta",
  "dallas": "Dallas",
  "los-angeles": "Los Angeles",
  "riverside": "Riverside",
  "northern-virginia": "NOVA",
  "washington-dc": "DC",
  "baltimore": "Baltimore",
  "maryland-suburbs": "Baltimore",
  "maryland": "Baltimore",
  "nova": "NOVA",
  "la": "Los Angeles",
  "los-angeles-ca": "Los Angeles",
};

function toCrmMarket(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return SLUG_TO_CRM_MARKET[slug] ?? slug;
}

// ── Upstash Redis (Vercel Marketplace) — durable lead store + rate limiting.
// Env-gated exactly like Resend/CRM below: absent env = log-and-continue in
// dev, never a crash. The leads:v1 list also feeds the future /admin lead log.
const LEADS_KEY = "leads:v1";
const LEADS_MAX = 5000; // capped index — newest first, oldest trimmed

// Var names match what the Vercel × Upstash Marketplace integration actually
// provisions for this project (confirmed in the dashboard) — NOT Upstash's own
// "UPSTASH_REDIS_REST_URL/TOKEN" convention, which Redis.fromEnv() expects.
// The custom install prefix "UPSTASH_REDIS_REST" got prepended to Upstash's
// own default names, doubling the "REST" segment. Of the 5 vars the
// integration creates, these two are the read-write REST API pair — not
// _KV_URL/_REDIS_URL (different protocols) and not _READ_ONLY_TOKEN (can't LPUSH).
function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

// One limiter instance per warm lambda — cheap, and sliding-window state
// itself lives in Redis so cold starts don't reset it.
let ratelimit: Ratelimit | null | undefined;
function getRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;
  const redis = getRedis();
  ratelimit = redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: "rl:lead" })
    : null;
  return ratelimit;
}

/** Origin/referer tripwire: allow same-host, *.curbio.com, *.vercel.app, and
 *  ABSENT headers (some privacy tools strip them — tripwire, not a wall). */
function originAllowed(req: Request): boolean {
  const reqHost = new URL(req.url).host;
  for (const header of ["origin", "referer"] as const) {
    const value = req.headers.get(header);
    if (!value) continue;
    let host: string;
    try {
      host = new URL(value).host;
    } catch {
      return false; // present but unparseable — treat as hostile
    }
    const ok =
      host === reqHost ||
      host === "curbio.com" ||
      host.endsWith(".curbio.com") ||
      host.endsWith(".vercel.app");
    if (!ok) return false;
  }
  return true;
}

// Non-PII log line for a lead. Name/email/phone/address must NEVER appear in
// server logs (they land in Vercel's log drain) — only attribution + flags.
function leadLogContext(p: { source: string; market: string | null; channel: string; utm_source: string | null; utm_campaign: string | null; submittedAt: string }) {
  return {
    source: p.source,
    market: p.market,
    channel: p.channel,
    utm_source: p.utm_source,
    utm_campaign: p.utm_campaign,
    submittedAt: p.submittedAt,
  };
}

export async function POST(req: Request) {
  let body: LeadBody;
  try {
    body = (await req.json()) as LeadBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // ── 0a. Origin tripwire ──
  if (!originAllowed(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // ── 0b. Honeypot: the hidden `company` field arrived non-empty → bot.
  // Silent discard — return the normal success shape, never tip off the bot.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    console.log("[lead] discarded: honeypot");
    return NextResponse.json({ ok: true, pdf: null });
  }

  // ── 0c. Time trap: sub-2-second render→submit is bot speed. Both
  // timestamps come from the CLIENT clock (renderedAt via Date.now(),
  // submittedAt via new Date()), so clock skew vs the server can't eat real
  // leads. Absent/invalid values pass — tripwire, not a wall.
  const renderedAt = Number(body.renderedAt);
  const submittedMs = body.submittedAt ? Date.parse(body.submittedAt) : NaN;
  if (Number.isFinite(renderedAt) && renderedAt > 0 && Number.isFinite(submittedMs)) {
    const elapsed = submittedMs - renderedAt;
    if (elapsed >= 0 && elapsed < 2000) {
      console.log("[lead] discarded: time trap", { elapsedMs: elapsed });
      return NextResponse.json({ ok: true, pdf: null });
    }
  }

  // ── 0d. Per-IP rate limit (env-gated on Upstash) ──
  const limiter = getRatelimit();
  if (limiter) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    try {
      const { success } = await limiter.limit(ip);
      if (!success) {
        console.log("[lead] rate limited");
        return NextResponse.json(
          { ok: false, error: "Too many requests — please try again in a minute." },
          { status: 429 }
        );
      }
    } catch {
      // Rate limiter unavailable must never block a real lead.
      console.log("[lead] rate limiter unavailable — skipping");
    }
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

  // firstName/lastName are derived HERE, authoritatively — the client no
  // longer sends firstName (it used to duplicate this exact split).
  const nameParts = body.name!.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" "); // empty string for single-word names

  const payload = {
    name: body.name!.trim(),
    firstName,
    lastName,
    phone: body.phone?.trim() ?? "",
    email: body.email!.trim(),
    zip: body.zip ? body.zip.replace(/\D/g, "").slice(0, 5) : "",
    address: body.address?.trim() ?? "",
    description: body.description?.trim() ?? "",
    market: body.crmMarketName ?? toCrmMarket(body.market),
    source: body.source ?? "quote",
    variant: body.variant ?? null,
    magnet: body.magnet ?? null,
    submittedAt: body.submittedAt ?? new Date().toISOString(),
    detectedCity: body.detectedCity?.trim() ?? "",
    detectedRegion: body.detectedRegion?.trim() ?? "",
    utm_source: body.utm_source ?? null,
    utm_medium: body.utm_medium ?? null,
    utm_campaign: body.utm_campaign ?? null,
    utm_content: body.utm_content ?? null,
    utm_term: body.utm_term ?? null,
    // Passed through verbatim — never normalised (space + casing are load-bearing for CRM comparability).
    referralSourceId: body.referralSourceId ?? "landing page",
    // Derived from utm_source against the closed channel list (lib/channels.ts).
    // Always a valid channel — "direct" when utm_source is absent/unrecognized.
    channel: deriveChannel(body.utm_source),
    // Attribution model fields (spec): how + where the lead entered, and the
    // visitor's first-touch attribution captured client-side.
    entryPoint: body.entryPoint ?? "web_form",
    medium: body.medium ?? body.utm_medium ?? null,
    firstTouchChannel: body.firstTouchChannel ?? null,
    firstTouchCampaign: body.firstTouchCampaign ?? null,
  };
  const logCtx = leadLogContext(payload);

  // ── 1. Durable persistence — FIRST, before any delivery. A lead that
  // reaches Redis is recoverable no matter what Resend/CRM do below.
  const redis = getRedis();
  let persistAttempted = false;
  let persistOk = false;
  if (redis) {
    persistAttempted = true;
    try {
      await redis.lpush(LEADS_KEY, JSON.stringify(payload));
      // Capped index: keep the newest LEADS_MAX, trim the tail.
      await redis.ltrim(LEADS_KEY, 0, LEADS_MAX - 1);
      persistOk = true;
      console.log("[lead] persisted", logCtx);
    } catch (err) {
      console.error("[lead] persistence FAILED", logCtx, err instanceof Error ? err.message : String(err));
    }
  } else {
    console.log("[lead] (no Upstash configured) skipping persistence", logCtx);
  }

  // ── 2. Deliveries — Resend notification + CRM webhook, in PARALLEL.
  // They were serial awaits; neither depends on the other, and both were
  // delaying the visitor's response.
  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.LEAD_NOTIFY_EMAIL;
  // Keep the grudman1@gmail.com fallback — leads must always have a recipient.
  const resendTo = process.env.RESEND_TO_EMAIL || notifyEmail || "grudman1@gmail.com";
  const resend = resendKey ? new Resend(resendKey) : null;

  async function sendLeadNotification(): Promise<boolean> {
    if (!resend) {
      console.log("[resend] skipped — RESEND_API_KEY not set");
      return false;
    }
    const subject = `New Curbio Lead — ${payload.firstName} ${payload.lastName} — ${payload.market ?? "unknown market"}`.trim();
    const text = [
      `Name:        ${payload.name}`,
      `Email:       ${payload.email}`,
      `Phone:       ${payload.phone || "(not provided)"}`,
      `Market:      ${payload.market ?? ""}`,
      `ZIP:         ${payload.zip || ""}`,
      ``,
      `Channel:     ${payload.channel}`,
      `utm_source:  ${payload.utm_source ?? ""}`,
      `utm_campaign:${payload.utm_campaign ?? ""}`,
      `utm_medium:  ${payload.utm_medium ?? ""}`,
      `utm_content: ${payload.utm_content ?? ""}`,
      `utm_term:    ${payload.utm_term ?? ""}`,
      ``,
      `First touch: ${payload.firstTouchChannel ?? ""} / ${payload.firstTouchCampaign ?? ""}`,
      `Submitted:   ${payload.submittedAt}`,
      `Source:      ${payload.source}`,
    ].join("\n");
    const result = await resend.emails.send({
      from: "Curbio Leads <onboarding@resend.dev>",
      to: resendTo,
      subject,
      text,
    });
    if (result.error) throw new Error(result.error.message);
    console.log("[resend] sent", { ok: true });
    return true;
  }

  async function postToCrm(): Promise<boolean> {
    const webhook = process.env.CURBIO_CRM_WEBHOOK_URL;
    if (!webhook) {
      console.log("[lead] (no CRM webhook configured)", logCtx);
      return false;
    }
    const crmPayload = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      zip: payload.zip,
      address: payload.address,
      market: payload.market,
      referralSourceId: payload.referralSourceId,
      channel: payload.channel,
      utmSource: payload.utm_source,
      utmMedium: payload.utm_medium,
      utmCampaign: payload.utm_campaign,
      entryPoint: payload.entryPoint,
      medium: payload.medium,
      firstTouchChannel: payload.firstTouchChannel,
      firstTouchCampaign: payload.firstTouchCampaign,
    };
    console.log("[lead] posting to CRM", logCtx); // payload itself is PII — never log it
    const res = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.CURBIO_CRM_API_KEY
          ? { authorization: `Bearer ${process.env.CURBIO_CRM_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(crmPayload),
    });
    if (!res.ok) {
      throw new Error(`CRM webhook returned ${res.status}`);
    }
    console.log("[lead] CRM ok", res.status);
    return true;
  }

  const [resendResult, crmResult] = await Promise.allSettled([sendLeadNotification(), postToCrm()]);
  // "Attempted" = the integration is configured; fulfilled-false means skipped.
  const resendAttempted = !!resend;
  const crmAttempted = !!process.env.CURBIO_CRM_WEBHOOK_URL;
  const resendOk = resendResult.status === "fulfilled" && resendResult.value;
  const crmOk = crmResult.status === "fulfilled" && crmResult.value;
  if (resendResult.status === "rejected") {
    console.error("[resend] send FAILED", logCtx, resendResult.reason instanceof Error ? resendResult.reason.message : String(resendResult.reason));
  }
  if (crmResult.status === "rejected") {
    console.error("[lead] CRM delivery FAILED", logCtx, crmResult.reason instanceof Error ? crmResult.reason.message : String(crmResult.reason));
  }

  // ── 3. CRM failure alert — the lead must always be recoverable from either
  // Redis or a human inbox. Awaited (not fire-and-forget) so the serverless
  // runtime can't kill it mid-send.
  if (crmAttempted && !crmOk && resend) {
    try {
      await resend.emails.send({
        from: "Curbio Leads <onboarding@resend.dev>",
        to: resendTo,
        subject: "⚠️ CRM delivery FAILED — lead preserved",
        text: [
          "The CRM webhook rejected or failed for the lead below.",
          `Persisted to Redis: ${persistOk ? "yes" : "NO — this email is the only copy"}`,
          "",
          JSON.stringify(payload, null, 2),
        ].join("\n"),
      });
      console.log("[lead] CRM-failure alert sent", logCtx);
    } catch (err) {
      console.error("[lead] CRM-failure alert FAILED", logCtx, err instanceof Error ? err.message : String(err));
    }
  }

  // ── 4. Response. Persistence success alone is enough for ok:true — the
  // lead is safe; deliverability is our problem, not the visitor's. 500 only
  // when everything that was attempted failed AND nothing succeeded, so the
  // form shows its retry error. Dev with nothing configured stays ok:true.
  const anySuccess = persistOk || resendOk || crmOk;
  const anyAttempted = persistAttempted || resendAttempted || crmAttempted;
  if (anyAttempted && !anySuccess) {
    console.error("[lead] UNRECOVERABLE — persistence and all deliveries failed", logCtx);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  const pdf =
    payload.source === "magnet" && payload.magnet ? MAGNET_FILES[payload.magnet] ?? null : null;

  return NextResponse.json({ ok: true, pdf });
}
