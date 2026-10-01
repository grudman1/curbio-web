import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { ANSWER_LABEL, type Giveaway } from "@/config/giveaways";
import { isKnownReferralSource } from "@/config/campaigns/types";
import { crmNameForSlug } from "@/config/markets";
import { dealNote, leadSource, type AppReason, type GiveawayEntry } from "./entry";

// ─────────────────────────────────────────────────────────────────────────────
// HANDING A GIVEAWAY ENTRANT TO THE APP — as a lead, in the lead store's own
// shapes.
//
// THIS IS A SECOND COPY OF app/api/lead/route.ts's delivery, and it is one on
// purpose. /api/lead is the endpoint /exp and /lp/sell earn on every week, and
// it has already lost four "improvements" that each ate real leads. Sending
// giveaway traffic through it would have meant adding an optional field and a
// skip-the-CRM branch to that file days before a conference. Leaving it
// byte-for-byte untouched is worth a duplicated function.
//
// What MUST stay in step with that route, because other code reads it:
//
//   leads:v1            the record shape lib/adminLeads.ts (StoredLead) reads
//   leads:delivery:v1   the outcome shape (DeliveryRecord), joined on leadId
//   the CRM payload     key NAMES are matched by the app's intake — a key it
//                       does not recognise is silently dropped, which is how
//                       three columns stayed empty until 2026-08-27
//
// A giveaway lead therefore shows up on the Leads screen, in the CRM-failure
// banner and in the delivery counts exactly like any other lead. If /api/lead
// changes any of the three, change this file in the same commit. After eXpcon
// the right fix is one shared delivery module that both call.
//
// What is DIFFERENT here, deliberately:
//
//   - A market is guaranteed (appDecision refuses an entry without one), so
//     the route's "unroutable" branch has no equivalent.
//   - The 90-day answer rides in `workDetails`, the app's free-text "requested
//     work" field — the one thing an HSM actually sees on the deal and in
//     their new-lead email. Gated by a switch, because that field is Rich's.
//   - Nothing here DEDUPES. The app does not either: for a lead with a market
//     and no ZIP, every POST makes a new deal. One entry per email is what
//     stops a double-tap becoming two deals, and that is enforced upstream.
//   - A RETRY re-uses the first attempt's lead id (`retryLeadId`). The lead is
//     already in leads:v1 and its alert already went out, so a retry only
//     re-posts to the app and overwrites the delivery record under the same
//     id — the Leads screen keeps one row for the person, and its failure
//     banner clears when the retry lands instead of lingering for a day.
// ─────────────────────────────────────────────────────────────────────────────

const LEADS_KEY = "leads:v1";
const LEADS_MAX = 5000;
const DELIVERY_KEY = "leads:delivery:v1";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

/** Same rule as the lead route: a third-party error body may echo what was
 *  submitted, and a log line is not a PII-safe place. */
function redactPii(text: string, secrets: (string | null | undefined)[]): string {
  let out = text;
  for (const s of [...secrets].filter((v): v is string => !!v && v.length > 3).sort((a, b) => b.length - a.length)) {
    out = out.split(s).join("[redacted]");
  }
  return out;
}

export type AppDeliveryResult = {
  leadId: string;
  persistOk: boolean;
  crmAttempted: boolean;
  crmOk: boolean;
  crmStatus: number | null;
  crmError: string | null;
};

export async function deliverToApp(
  giveaway: Giveaway,
  entry: GiveawayEntry,
  reason: AppReason,
  options: { includeDealNote: boolean; retryLeadId?: string }
): Promise<AppDeliveryResult> {
  const a = entry.attribution;
  const note = dealNote(giveaway, entry.listing90);
  const isRetry = !!options.retryLeadId;

  const payload = {
    leadId: options.retryLeadId ?? crypto.randomUUID(),
    name: entry.name,
    firstName: entry.firstName,
    lastName: entry.lastName,
    phone: entry.phone,
    email: entry.email,
    zip: entry.zip,
    address: "",
    // Ours, not the CRM's: kept on the stored lead so the record explains
    // itself even while the deal-note switch is off.
    description: note,
    market: crmNameForSlug(entry.marketSlug),
    source: leadSource(giveaway, entry.marketSlug),
    variant: null,
    magnet: null,
    // When they became a LEAD, which for someone who booked two days after
    // entering is not when they entered.
    submittedAt: new Date().toISOString(),
    detectedCity: "",
    detectedRegion: "",
    utm_source: a.utm_source,
    utm_medium: a.utm_medium,
    utm_campaign: a.utm_campaign,
    utm_content: a.utm_content,
    utm_term: a.utm_term,
    referralSourceId: a.referralSourceId,
    referralSourceVerified: isKnownReferralSource(a.referralSourceId),
    channel: a.channel,
    entryPoint: a.entryPoint,
    marketSource: entry.marketSource,
    medium: a.utm_medium,
    firstTouchChannel: a.firstTouchChannel,
    firstTouchCampaign: a.firstTouchCampaign,
    // Additive. Readers of leads:v1 ignore keys they do not know.
    giveaway: giveaway.slug,
    giveawayEntryId: entry.id,
    listing90: entry.listing90,
    appReason: reason,
  };

  // Non-PII only — same fields the lead route logs.
  const logCtx = {
    source: payload.source,
    market: payload.market,
    channel: payload.channel,
    utm_source: payload.utm_source,
    utm_campaign: payload.utm_campaign,
    submittedAt: payload.submittedAt,
    referralSourceId: payload.referralSourceId,
    referralSourceVerified: payload.referralSourceVerified,
    appReason: reason,
  };

  // ── 1. Persist FIRST. A lead in Redis is recoverable whatever happens next.
  //       Not on a retry: the first attempt stored it, under this same id.
  const redis = getRedis();
  let persistOk = isRetry;
  if (redis && !isRetry) {
    try {
      await redis.lpush(LEADS_KEY, JSON.stringify(payload));
      await redis.ltrim(LEADS_KEY, 0, LEADS_MAX - 1);
      persistOk = true;
      console.log("[giveaway] lead persisted", logCtx);
    } catch (err) {
      console.error("[giveaway] lead persistence FAILED", logCtx, err instanceof Error ? err.message : String(err));
    }
  }

  // ── 2. Notification + CRM, in parallel.
  const resendKey = process.env.RESEND_API_KEY;
  // Same recipient chain as the lead route, including its last-resort address:
  // a lead alert with nowhere to go is the failure this chain exists to prevent.
  const resendTo = process.env.RESEND_TO_EMAIL || process.env.LEAD_NOTIFY_EMAIL || "grudman1@gmail.com";
  const resend = resendKey ? new Resend(resendKey) : null;

  async function sendLeadNotification(): Promise<boolean> {
    // A retry's lead was announced by its first attempt.
    if (!resend || isRetry) return false;
    const text = [
      `Name:        ${payload.name}`,
      `Email:       ${payload.email}`,
      `Phone:       ${payload.phone || "(not provided)"}`,
      `Market:      ${payload.market ?? ""}`,
      `ZIP:         ${payload.zip || ""}`,
      ``,
      `Giveaway:    ${giveaway.event.shortName}`,
      `Listing in next 90 days: ${ANSWER_LABEL[entry.listing90]}`,
      `Sent to app because: ${reason}`,
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
      subject: `New Curbio Lead — ${payload.firstName} ${payload.lastName} — ${payload.market ?? "unknown market"}`.trim(),
      text,
    });
    if (result.error) throw new Error(result.error.message);
    return true;
  }

  let crmStatus: number | null = null;
  let crmBody: string | null = null;
  const webhook = process.env.CURBIO_CRM_WEBHOOK_URL;

  async function postToCrm(): Promise<boolean> {
    if (!webhook) return false;
    // Key names are the app's column names — see the header.
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
      utmContent: payload.utm_content,
      origin: payload.entryPoint,
      leadSource: payload.firstTouchChannel,
      firstTouchCampaign: payload.firstTouchCampaign,
      ...(options.includeDealNote ? { workDetails: note } : {}),
    };
    console.log("[giveaway] posting lead to CRM", logCtx); // payload itself is PII — never log it
    const res = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.CURBIO_CRM_API_KEY ? { authorization: `Bearer ${process.env.CURBIO_CRM_API_KEY}` } : {}),
      },
      body: JSON.stringify(crmPayload),
    });
    crmStatus = res.status;
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      crmBody = redactPii(raw, [payload.email, payload.name, payload.phone]).trim().slice(0, 500);
      throw new Error(`CRM webhook returned ${res.status}${crmBody ? ` — ${crmBody}` : " — (empty body)"}`);
    }
    return true;
  }

  const [resendResult, crmResult] = await Promise.allSettled([sendLeadNotification(), postToCrm()]);
  const resendAttempted = !!resend && !isRetry;
  const crmAttempted = !!webhook;
  const resendOk = resendResult.status === "fulfilled" && resendResult.value;
  const crmOk = crmResult.status === "fulfilled" && crmResult.value;
  if (resendResult.status === "rejected") {
    console.error("[giveaway] lead notification FAILED", logCtx, String(resendResult.reason));
  }
  if (crmResult.status === "rejected") {
    crmBody ??= crmResult.reason instanceof Error ? crmResult.reason.message.slice(0, 500) : String(crmResult.reason);
    console.error("[giveaway] CRM delivery FAILED", logCtx, crmBody);
  }

  // ── 3. Failure alert — the lead must be recoverable from Redis or an inbox.
  if (crmAttempted && !crmOk && resend) {
    try {
      await resend.emails.send({
        from: "Curbio Leads <onboarding@resend.dev>",
        to: resendTo,
        subject: "⚠️ CRM delivery FAILED — lead preserved",
        text: [
          `The CRM webhook rejected or failed for the ${giveaway.event.shortName} giveaway lead below.`,
          `Persisted to Redis: ${persistOk ? "yes" : "NO — this email is the only copy"}`,
          "It will NOT be retried automatically (a retry of a request that actually landed makes a duplicate deal).",
          "Resend it from the giveaway entries screen once the app is healthy.",
          "",
          JSON.stringify(payload, null, 2),
        ].join("\n"),
      });
    } catch (err) {
      console.error("[giveaway] CRM-failure alert FAILED", logCtx, err instanceof Error ? err.message : String(err));
    }
  }

  // ── 4. Delivery record, keyed by leadId — what the Leads screen joins on.
  if (redis) {
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
          unroutable: false,
          recordedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[giveaway] delivery-record write failed (lead itself is safe)", logCtx, err instanceof Error ? err.message : String(err));
    }
  }

  return { leadId: payload.leadId, persistOk, crmAttempted, crmOk, crmStatus, crmError: crmOk ? null : crmBody };
}
