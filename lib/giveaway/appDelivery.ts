import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { ANSWER_LABEL, type Giveaway } from "@/config/giveaways";
import { isKnownReferralSource } from "@/config/campaigns/types";
import { crmNameForSlug } from "@/config/markets";
import { leadSource, type AppReason, type GiveawayEntry } from "./entry";
import { storeScope } from "./mode";
import { claimLeadRow, safeError } from "./store";
import { parseEstimateId } from "./estimateId";

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
//   - The 90-day answer is NOT sent to the app. Any lead that reaches it is
//     assumed to have a listing, so a note would say nothing new. The answer
//     stays on the entry (and, as `listing90`, on the stored lead row).
//   - Nothing here DEDUPES. The app does not either: for a lead with a market
//     and no ZIP, every POST makes a new deal. One entry per email is what
//     stops a double-tap becoming two deals, and that is enforced upstream.
//   - The caller chooses the LEAD ID and a retry passes the same one again.
//     The leads:v1 row is written once per id (claimLeadRow), so a retry only
//     re-posts to the app and overwrites the delivery record under that id —
//     the Leads screen keeps one row for the person, and its failure banner
//     clears when the retry lands instead of lingering for a day.
//   - The app's intake is given 8 SECONDS. The lead route waits indefinitely;
//     here a hang would hold the per-person lock (store.ts) and, worse, get
//     the whole request killed before anything was recorded. A timeout turns
//     "we do not know" into a recorded failure an owner can act on.
//   - No "New lead" email per entrant by default. Those go through the same
//     Resend account as /api/lead's alerts, and a busy afternoon at the booth
//     must not spend the allowance that tells us a real lead failed. The
//     FAILURE alert is always sent. `giveaway.leadEmails` is the switch.
// ─────────────────────────────────────────────────────────────────────────────

const LEADS_KEY = "leads:v1";
const LEADS_MAX = 5000;
const DELIVERY_KEY = "leads:delivery:v1";

/** How long the app's intake has to answer. See the header. */
const CRM_TIMEOUT_MS = 8_000;
/** How long an alert email may take before it is abandoned. */
const EMAIL_TIMEOUT_MS = 5_000;

let cachedRedis: Redis | null = null;
function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  cachedRedis ??= new Redis({ url, token });
  return cachedRedis;
}

/** Give up on `work` after `ms`. The work itself is not cancelled — an email
 *  that is merely slow may still arrive — but nothing waits on it. */
function within<T>(ms: number, work: Promise<T>, what: string): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms)),
  ]);
}

// ── Where failure alerts go, and the test of it ──────────────────────────────

/** The sender of every giveaway email. Resend's shared test address: until a
 *  domain is verified in the Resend account it may deliver ONLY to the account
 *  owner's own address, and anything else is refused at send time — which the
 *  test below surfaces rather than leaving it to be found on the day. */
const ALERT_FROM = "Curbio Leads <onboarding@resend.dev>";

/** Same recipient chain as the lead route, including its last-resort address:
 *  a lead alert with nowhere to go is the failure this chain exists to prevent.
 *  `source` says which link of the chain supplied it. */
export function alertRecipient(): { to: string; source: "RESEND_TO_EMAIL" | "LEAD_NOTIFY_EMAIL" | "built-in default" } {
  if (process.env.RESEND_TO_EMAIL) return { to: process.env.RESEND_TO_EMAIL, source: "RESEND_TO_EMAIL" };
  if (process.env.LEAD_NOTIFY_EMAIL) return { to: process.env.LEAD_NOTIFY_EMAIL, source: "LEAD_NOTIFY_EMAIL" };
  return { to: "grudman1@gmail.com", source: "built-in default" };
}

export function alertEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export type AlertTestResult =
  | { ok: true; to: string; id: string | null }
  | { ok: false; to: string; error: string };

/**
 * Send a clearly-labelled TEST through exactly the path a real "CRM delivery
 * FAILED" alert takes — same Resend account, same sender, same recipient chain,
 * same timeout — and report the email service's own answer. A refusal (an
 * unverified sender, a recipient it will not deliver to, a bad key) comes back
 * as an error here, which is the point: find out now, not at 11am on Thursday.
 * "Accepted" means Resend took it; the proof is it arriving in the inbox.
 */
export async function sendTestAlert(by: string): Promise<AlertTestResult> {
  const { to } = alertRecipient();
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, to, error: "No email key (RESEND_API_KEY) is set in this environment, so no alert can be sent." };
  try {
    const result = await within(
      EMAIL_TIMEOUT_MS,
      new Resend(key).emails.send({
        from: ALERT_FROM,
        to,
        subject: "TEST — Curbio giveaway failure alerts reach you",
        text: [
          "This is a TEST of the alert that is emailed when a giveaway lead cannot be delivered to the app.",
          "",
          "If you can read this, a real \"CRM delivery FAILED\" alert will reach this inbox.",
          `Pressed by: ${by}`,
          `Sent: ${new Date().toISOString()}`,
        ].join("\n"),
      }),
      "test alert"
    );
    if (result.error) return { ok: false, to, error: result.error.message };
    return { ok: true, to, id: result.data?.id ?? null };
  } catch (err) {
    return { ok: false, to, error: err instanceof Error ? err.message : String(err) };
  }
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
  /** The app's estimate id, when it accepted the lead and said which. */
  crmEstimateId: number | null;
  crmError: string | null;
};

export async function deliverToApp(
  giveaway: Giveaway,
  entry: GiveawayEntry,
  reason: AppReason,
  options: { leadId: string }
): Promise<AppDeliveryResult> {
  const a = entry.attribution;

  const payload = {
    leadId: options.leadId,
    name: entry.name,
    firstName: entry.firstName,
    lastName: entry.lastName,
    phone: entry.phone,
    email: entry.email,
    zip: entry.zip,
    address: "",
    description: "",
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
  //       Once per lead id: a retry finds the row its first attempt wrote.
  const redis = getRedis();
  let persistOk = false;
  let firstAttempt = true;
  if (redis) {
    try {
      firstAttempt = await claimLeadRow(storeScope(giveaway), payload.leadId);
      if (firstAttempt) {
        await redis.lpush(LEADS_KEY, JSON.stringify(payload));
        await redis.ltrim(LEADS_KEY, 0, LEADS_MAX - 1);
        console.log("[giveaway] lead persisted", logCtx);
      }
      persistOk = true;
    } catch (err) {
      console.error("[giveaway] lead persistence FAILED", logCtx, safeError(err));
    }
  }

  // ── 2. Notification + CRM, in parallel.
  const resendKey = process.env.RESEND_API_KEY;
  const resendTo = alertRecipient().to;
  const resend = resendKey ? new Resend(resendKey) : null;

  // Announce a lead once, and only when this giveaway asks for it.
  const announce = !!resend && firstAttempt && giveaway.leadEmails === "every-lead";

  async function sendLeadNotification(): Promise<boolean> {
    if (!resend || !announce) return false;
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
    const result = await within(
      EMAIL_TIMEOUT_MS,
      resend.emails.send({
        from: ALERT_FROM,
        to: resendTo,
        subject: `New Curbio Lead — ${payload.firstName} ${payload.lastName} — ${payload.market ?? "unknown market"}`.trim(),
        text,
      }),
      "lead notification"
    );
    if (result.error) throw new Error(result.error.message);
    return true;
  }

  let crmStatus: number | null = null;
  let crmEstimateId: number | null = null;
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
    };
    console.log("[giveaway] posting lead to CRM", logCtx); // payload itself is PII — never log it
    const res = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.CURBIO_CRM_API_KEY ? { authorization: `Bearer ${process.env.CURBIO_CRM_API_KEY}` } : {}),
      },
      body: JSON.stringify(crmPayload),
      signal: AbortSignal.timeout(CRM_TIMEOUT_MS),
    });
    crmStatus = res.status;
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      crmBody = redactPii(raw, [payload.email, payload.name, payload.phone]).trim().slice(0, 500);
      throw new Error(`CRM webhook returned ${res.status}${crmBody ? ` — ${crmBody}` : " — (empty body)"}`);
    }
    // The body is the estimate id. Best effort: failing to read it must never
    // turn a lead the app accepted into a failure.
    crmEstimateId = parseEstimateId(await res.text().catch(() => ""));
    return true;
  }

  const [resendResult, crmResult] = await Promise.allSettled([sendLeadNotification(), postToCrm()]);
  const resendAttempted = announce;
  const crmAttempted = !!webhook;
  const resendOk = resendResult.status === "fulfilled" && resendResult.value;
  const crmOk = crmResult.status === "fulfilled" && crmResult.value;
  if (resendResult.status === "rejected") {
    console.error("[giveaway] lead notification FAILED", logCtx, String(resendResult.reason));
  }
  if (crmResult.status === "rejected") {
    const timedOut = crmResult.reason instanceof Error && crmResult.reason.name === "TimeoutError";
    crmBody ??= timedOut
      ? `No answer from the app within ${CRM_TIMEOUT_MS / 1000} seconds — it may or may not have received this lead. Check the app before retrying.`
      : crmResult.reason instanceof Error
        ? crmResult.reason.message.slice(0, 500)
        : String(crmResult.reason);
    console.error("[giveaway] CRM delivery FAILED", logCtx, crmBody);
  }

  // ── 3. Failure alert — the lead must be recoverable from Redis or an inbox.
  if (crmAttempted && !crmOk && resend) {
    try {
      await within(
        EMAIL_TIMEOUT_MS,
        resend.emails.send({
          from: ALERT_FROM,
          to: resendTo,
          subject: "⚠️ CRM delivery FAILED — lead preserved",
          text: [
            `The CRM webhook rejected or failed for the ${giveaway.event.shortName} giveaway lead below.`,
            crmBody ? `What came back: ${crmBody}` : "",
            `Persisted to Redis: ${persistOk ? "yes" : "NO — this email is the only copy"}`,
            "It will NOT be retried automatically (a retry of a request that actually landed makes a duplicate deal).",
            "Check the app for this person, then use Retry on the giveaway entries screen.",
            "",
            JSON.stringify(payload, null, 2),
          ].join("\n"),
        }),
        "failure alert"
      );
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
          crmEstimateId,
          crmError: crmOk ? null : crmBody,
          unroutable: false,
          recordedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[giveaway] delivery-record write failed (lead itself is safe)", logCtx, safeError(err));
    }
  }

  return {
    leadId: payload.leadId,
    persistOk,
    crmAttempted,
    crmOk,
    crmStatus,
    crmEstimateId: crmOk ? crmEstimateId : null,
    crmError: crmOk ? null : crmBody,
  };
}
