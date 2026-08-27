import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Redis } from "@upstash/redis";
import { deriveChannel } from "@/lib/channels";
import { crmNameForSlug } from "@/config/markets";
import { isKnownReferralSource } from "@/config/campaigns/types";

// ─────────────────────────────────────────────────────────────────────────────
// NOTHING IN THIS ROUTE MAY REJECT A SUBMISSION IT CANNOT PROVE IS FAKE.
//
// This endpoint has now lost four separate "anti-abuse" mechanisms, every one
// of which ate real leads before anyone noticed:
//
//   1. Honeypot field (`company`) — browsers autofilled it from saved
//      address/business profiles. Silently discarded real leads with ok:true.
//   2. Blocking time trap — a real visitor using one-click autofill submits in
//      under 2s. Now log-only (kept below); never discards.
//   3. Per-IP rate limit (5/min) — one brokerage office behind a single shared
//      NAT'd wifi egress IP is a completely ordinary five-agents-in-a-minute
//      burst. Removed.
//   4. Origin/referer allowlist — privacy tools, corporate proxies, webview
//      wrappers and some email clients strip or rewrite these headers, and a
//      403 there is indistinguishable from an outage to the visitor. Removed.
//
// Curbio receives no spam. The expected value of blocking a bot here is
// approximately zero; the cost of blocking one agent is a lost listing.
//
// If filtering is ever genuinely needed: QUARANTINE AND ALERT — write the
// submission to Redis, flag it, notify a human. Never discard, never 4xx.
// ─────────────────────────────────────────────────────────────────────────────

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
  /** WHICH SIGNAL decided `market`, straight from lib/resolveMarket.ts:
   *  "param" | "zip" | "geo" | "out-of-area" | "none". The resolver computed
   *  this at render and threw it away, which is why no historical lead can
   *  say how its market was chosen. Persisted from here on. */
  marketSource?: string;
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
  // Spam tripwire — client-side form-render timestamp. See the check at the
  // top of POST. (A honeypot field also lived here briefly — removed: named
  // `company`, it was silently autofilled by real visitors' browsers from a
  // saved address/business profile, discarding every real lead as a "bot".)
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

// Slug → the exact market string the CRM expects, from the single market list
// (config/markets.ts `crmName`). This replaced a hand-maintained map that sent
// "Baltimore" — a market the CRM has never had, and which the operator API
// calls "Maryland". It only ever fired on the fallback path (crmMarketName from
// the live API takes precedence), so it silently mis-tagged exactly those leads
// where the API had already failed to resolve.
//
// Returns null rather than passing the slug through when unrecognised: sending
// the CRM a market it does not know is worse than sending none, because it
// looks like data.
function toCrmMarket(slug: string | null | undefined): string | null {
  return crmNameForSlug(slug);
}

// ── Upstash Redis (Vercel Marketplace) — durable lead store.
// Env-gated exactly like Resend/CRM below: absent env = log-and-continue in
// dev, never a crash. The leads:v1 list also feeds the future /admin lead log.
const LEADS_KEY = "leads:v1";
const LEADS_MAX = 5000; // capped index — newest first, oldest trimmed

// Waitlist submissions (out-of-area visitors) live in their OWN list, not
// leads:v1. They are a real signal — where expansion demand is — but they
// are not a sales lead: there is no market to route them to yet, so posting
// them to the CRM only produces a 404 ("not in that area") that the delivery
// hash below then reports as a CRM FAILURE. Keeping them out of leads:v1
// entirely (rather than writing there and suppressing the alert) means they
// can never appear in the Leads tab's delivery numbers or the CRM-failure
// banner — there is no code path left that could regress that.
const WAITLIST_KEY = "waitlist:leads";
const WAITLIST_MAX = 5000;

// Delivery outcomes, keyed by the `leadId` now carried on every leads:v1
// record. A SEPARATE key on purpose: leads:v1 is written BEFORE any delivery
// is attempted (that ordering is the whole recoverability guarantee), so the
// outcome cannot be known at write time, and rewriting the list entry
// afterwards would mean an index-based LSET that concurrent LPUSHes shift out
// from under us. A hash sidesteps both — the list write path is untouched and
// /admin joins the two on leadId. Records written before this shipped simply
// have no entry here; the viewer renders those as "unknown", not "failed".
const DELIVERY_KEY = "leads:delivery:v1";

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

/** Strip this lead's own PII out of a third-party response body before it goes
 *  anywhere near a log line. The CRM echoes submitted values back in some of
 *  its error responses, and Vercel log drains are not a PII-safe destination —
 *  the same rule leadLogContext() enforces, applied to text we didn't author.
 *  Longest-first so "name" can't partially match inside "email". */
function redactPii(text: string, secrets: (string | null | undefined)[]): string {
  let out = text;
  for (const s of [...secrets].filter((v): v is string => !!v && v.length > 3).sort((a, b) => b.length - a.length)) {
    out = out.split(s).join("[redacted]");
  }
  return out;
}

// Non-PII log line for a lead. Name/email/phone/address must NEVER appear in
// server logs (they land in Vercel's log drain) — only attribution + flags.
function leadLogContext(p: {
  source: string;
  market: string | null;
  channel: string;
  utm_source: string | null;
  utm_campaign: string | null;
  submittedAt: string;
  referralSourceId: string;
  referralSourceVerified: boolean;
}) {
  return {
    source: p.source,
    market: p.market,
    channel: p.channel,
    utm_source: p.utm_source,
    utm_campaign: p.utm_campaign,
    submittedAt: p.submittedAt,
    // Non-PII: a brokerage/partner name, not personal data. Logged so the
    // spread of unverified values arriving from the ~40 partner vanity
    // redirects is visible without waiting on the admin viewer.
    referralSourceId: p.referralSourceId,
    referralSourceVerified: p.referralSourceVerified,
  };
}

export async function POST(req: Request) {
  let body: LeadBody;
  try {
    body = (await req.json()) as LeadBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // ── 0. Time trap: NON-BLOCKING. Sub-2-second render→submit is unusual,
  // but a real visitor clicking a browser-autofill suggestion (one click
  // populates every field) and submitting immediately after can legitimately
  // land under 2s — confirmed live: a real submission logged elapsedMs:1861
  // the same day this shipped. Given the honeypot incident earlier today
  // (a silent, ok:true discard on a bad heuristic ate real leads for two
  // deploys before anyone noticed), this signal is logged for visibility
  // only and never discards — see .env.example / PR history for the
  // reasoning. Both timestamps come from the CLIENT clock (renderedAt via
  // Date.now(), submittedAt via new Date()), so clock skew can't affect this.
  const renderedAt = Number(body.renderedAt);
  const submittedMs = body.submittedAt ? Date.parse(body.submittedAt) : NaN;
  if (Number.isFinite(renderedAt) && renderedAt > 0 && Number.isFinite(submittedMs)) {
    const elapsed = submittedMs - renderedAt;
    if (elapsed >= 0 && elapsed < 2000) {
      console.log("[lead] fast submission — kept", { elapsedMs: elapsed });
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
    // Join key between the leads:v1 record and its leads:delivery:v1 outcome.
    // Generated here so it is stored WITH the lead on the persist-first write.
    leadId: crypto.randomUUID(),
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
    // Passed through VERBATIM — never normalised (space + casing are
    // load-bearing for CRM comparability), and never rejected. The ~40 partner
    // vanity redirects on go.curbio.com pass hand-written values
    // ("Keller Williams Realty Boston Northwest" and similar); validating them
    // against the known list would silently strip attribution from every live
    // partner link — the honeypot failure mode aimed at attribution.
    referralSourceId: body.referralSourceId ?? "landing page",
    // KEEP AND TAG. Records whether the value matched config/campaigns/types.ts
    // REFERRAL_SOURCE_IDS, so captured and inferred attribution stay
    // distinguishable in Redis and the /admin viewer rather than being
    // silently averaged together. Never gates anything.
    referralSourceVerified: isKnownReferralSource(body.referralSourceId ?? "landing page"),
    // Derived from utm_source against the closed channel list (lib/channels.ts).
    // Always a valid channel — "direct" when utm_source is absent/unrecognized.
    channel: deriveChannel(body.utm_source),
    // Attribution model fields (spec): how + where the lead entered, and the
    // visitor's first-touch attribution captured client-side.
    entryPoint: body.entryPoint ?? "web_form",
    // Provenance for `market`. Never inferred server-side — if the client did
    // not say, the record says nothing rather than guessing.
    marketSource: body.marketSource ?? null,
    medium: body.medium ?? body.utm_medium ?? null,
    firstTouchChannel: body.firstTouchChannel ?? null,
    firstTouchCampaign: body.firstTouchCampaign ?? null,
  };
  const logCtx = leadLogContext(payload);
  const isWaitlist = payload.source === "waitlist";

  // ── 1. Durable persistence — FIRST, before any delivery. A lead that
  // reaches Redis is recoverable no matter what Resend/CRM do below.
  const redis = getRedis();
  let persistAttempted = false;
  let persistOk = false;
  if (redis) {
    persistAttempted = true;
    try {
      const key = isWaitlist ? WAITLIST_KEY : LEADS_KEY;
      const max = isWaitlist ? WAITLIST_MAX : LEADS_MAX;
      await redis.lpush(key, JSON.stringify(payload));
      // Capped index: keep the newest `max`, trim the tail.
      await redis.ltrim(key, 0, max - 1);
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
    const subject = isWaitlist
      ? `Waitlist — ZIP ${payload.zip || "unknown"}${
          [payload.detectedCity, payload.detectedRegion].filter(Boolean).length
            ? `, ${[payload.detectedCity, payload.detectedRegion].filter(Boolean).join(" ")}`
            : ""
        }`
      : `New Curbio Lead — ${payload.firstName} ${payload.lastName} — ${payload.market ?? "unknown market"}`.trim();
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

  // Captured inside postToCrm so the delivery record below can store the exact
  // status/body rather than re-deriving them from a stringified Error.
  let crmStatus: number | null = null;
  let crmBody: string | null = null;

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
    crmStatus = res.status;
    if (!res.ok) {
      // Log the RESPONSE BODY, not just the status. A bare "returned 403" cost
      // an hour of investigation that a one-line body would have closed
      // immediately (the CRM rejects @curbio.com addresses outright — an
      // internal-domain guard, indistinguishable from an auth failure by
      // status code alone). Redacted and capped: the body is third-party text
      // that may echo submitted values, and log lines are not a PII sink.
      const raw = await res.text().catch(() => "");
      crmBody = redactPii(raw, [payload.email, payload.name, payload.phone, payload.address]).trim().slice(0, 500);
      throw new Error(`CRM webhook returned ${res.status}${crmBody ? ` — ${crmBody}` : " — (empty body)"}`);
    }
    console.log("[lead] CRM ok", res.status);
    return true;
  }

  // Waitlist leads never reach the CRM: there is no market to route them to,
  // and every out-of-area ZIP the webhook sees comes back 404 — a real
  // rejection, not a delivery failure, but the CRM has no way to say that.
  // Skipping the call (not just tolerating its failure) is what keeps these
  // out of the delivery-failure hash below.
  const [resendResult, crmResult] = await Promise.allSettled([
    sendLeadNotification(),
    isWaitlist ? Promise.resolve(false) : postToCrm(),
  ]);
  // "Attempted" = the integration is configured; fulfilled-false means skipped.
  const resendAttempted = !!resend;
  const crmAttempted = !isWaitlist && !!process.env.CURBIO_CRM_WEBHOOK_URL;
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

  // ── 3b. Delivery record — what actually happened to this lead, keyed by
  // leadId. Purely additive: leads:v1 and its write path are untouched. Runs
  // AFTER deliveries (their outcome is the point) but BEFORE the response, so
  // the serverless runtime can't be frozen mid-write. Wrapped so a Redis
  // hiccup here can never turn a successful lead into an error for the
  // visitor — this is diagnostics, and diagnostics never outrank a lead.
  //
  // Waitlist leads skip this entirely: they never entered leads:v1, so there
  // is nothing here for /admin to join against, and CRM was never attempted
  // in the first place.
  if (redis && !isWaitlist) {
    try {
      await redis.hset(DELIVERY_KEY, {
        [payload.leadId]: JSON.stringify({
          leadId: payload.leadId,
          submittedAt: payload.submittedAt,
          persistOk,
          resendAttempted,
          resendOk,
          crmAttempted,
          crmOk,
          crmStatus,
          crmError: crmOk ? null : crmBody,
          recordedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[lead] delivery-record write failed (lead itself is safe)", logCtx, err instanceof Error ? err.message : String(err));
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
