import { cache } from "react";
import { Redis } from "@upstash/redis";

// ─────────────────────────────────────────────────────────────────────────────
// READ-ONLY lead reader for /admin.
//
// Uses the READ-ONLY Upstash token, not the read-write one the lead route
// uses. That is the whole point: "no delete, no edit, no mutation" is enforced
// by the CREDENTIAL, not by convention. A bug in this file — or in anything
// that imports it — cannot write to the lead store, because the token it holds
// is not permitted to.
//
// The Redis schema and write path are untouched. This module only reads:
//   leads:v1           list, newest first, JSON-encoded lead payloads
//   leads:delivery:v1  hash, leadId → delivery outcome
// joined on `leadId`. Leads written before the delivery hash shipped have no
// entry, and are reported as "unknown" — never as "failed".
// ─────────────────────────────────────────────────────────────────────────────

const LEADS_KEY = "leads:v1";
const DELIVERY_KEY = "leads:delivery:v1";

export type StoredLead = {
  leadId?: string;
  name?: string;
  firstName?: string;
  email?: string;
  phone?: string;
  zip?: string;
  market?: string | null;
  /** WHICH SIGNAL decided `market` — "param" | "zip" | "geo" | "out-of-area"
   *  | "none", straight from lib/resolveMarket.ts. Absent on every lead
   *  written before this field shipped; see lib/marketSignals.ts, which
   *  reports that absence as `unknown` rather than inferring one. */
  marketSource?: string | null;
  source?: string;
  submittedAt?: string;
  channel?: string;
  entryPoint?: string;
  medium?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  firstTouchChannel?: string | null;
  firstTouchCampaign?: string | null;
  referralSourceId?: string;
  referralSourceVerified?: boolean;
  detectedCity?: string;
  detectedRegion?: string;
  variant?: string | null;
};

export type DeliveryRecord = {
  leadId: string;
  persistOk: boolean;
  resendAttempted: boolean;
  resendOk: boolean;
  crmAttempted: boolean;
  crmOk: boolean;
  crmStatus: number | null;
  crmError: string | null;
  recordedAt: string;
};

export type LeadRow = {
  lead: StoredLead;
  /** null when this lead predates the delivery hash — render as "unknown". */
  delivery: DeliveryRecord | null;
};

function getReadOnlyRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  // READ-ONLY on purpose. Never swap this for the read-write token.
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export type LeadsResult =
  | { configured: false }
  | { configured: true; rows: LeadRow[]; total: number; error: string | null };

/** Newest `limit` leads, joined with their delivery outcome.
 *
 *  Wrapped in React cache(): the admin layout (alert banner) and the Leads
 *  tab both call this with the same limit during one request, and should
 *  share one Redis read rather than two. */
export const readRecentLeads = cache(async (limit = 50): Promise<LeadsResult> => {
  const redis = getReadOnlyRedis();
  if (!redis) return { configured: false };

  try {
    // Upstash decodes JSON strings automatically when they parse as JSON, so
    // entries arrive as objects here rather than strings. Handle both.
    const [raw, total, deliveries] = await Promise.all([
      redis.lrange<StoredLead | string>(LEADS_KEY, 0, limit - 1),
      redis.llen(LEADS_KEY),
      redis.hgetall<Record<string, DeliveryRecord | string>>(DELIVERY_KEY),
    ]);

    const parse = <T,>(v: T | string): T | null => {
      if (typeof v !== "string") return v;
      try {
        return JSON.parse(v) as T;
      } catch {
        return null;
      }
    };

    const rows: LeadRow[] = (raw ?? [])
      .map((entry) => parse<StoredLead>(entry))
      .filter((l): l is StoredLead => !!l)
      .map((lead) => {
        const d = lead.leadId ? deliveries?.[lead.leadId] : undefined;
        return { lead, delivery: d ? parse<DeliveryRecord>(d) : null };
      });

    return { configured: true, rows, total: total ?? rows.length, error: null };
  } catch (err) {
    // A broken admin page must never look like a broken lead pipeline. Report
    // the read failure plainly instead of rendering an empty table that reads
    // as "no leads".
    return {
      configured: true,
      rows: [],
      total: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

// ── CRM delivery failures (alert sources) ────────────────────────────────────
// One implementation for both surfaces that show these: the Control Room's
// banner and the Marketing Hub's alerts panel. Scans the same "last N leads"
// window as the aggregates; if more than N leads arrive inside the window the
// oldest same-day failures fall out of this scan — they remain visible in the
// Leads tab counts, and the failure-alert email fires per incident regardless.

export type CrmFailure = {
  leadId: string;
  /** For sorting, newest first. */
  timestamp: number;
  /** "07-29 14:03" — already formatted for display. */
  time: string;
  /** One line: market · source · status. */
  summary: string;
  /** Error body / context. */
  detail: string;
};

export function recentCrmFailures(rows: LeadRow[], windowMs = 86_400_000): CrmFailure[] {
  const now = Date.now();
  const out: CrmFailure[] = [];
  for (const { lead, delivery } of rows) {
    if (!delivery?.crmAttempted || delivery.crmOk) continue;
    // An expected non-delivery is not an incident. Without this the banner
    // reports historical waitlist 404s as live CRM failures every time the
    // page loads.
    if (expectedNonDelivery(lead, delivery)) continue;
    const t = Date.parse(lead.submittedAt ?? "") || Date.parse(delivery.recordedAt ?? "");
    if (!Number.isFinite(t) || now - t >= windowMs) continue;
    out.push({
      leadId: delivery.leadId,
      timestamp: t,
      time: (lead.submittedAt ?? delivery.recordedAt).slice(5, 16).replace("T", " "),
      summary: `${lead.market ?? "?"} · ${lead.source ?? "?"} · HTTP ${delivery.crmStatus ?? "?"}`,
      detail: delivery.crmError ?? "no body",
    });
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}

// ── PII minimisation ─────────────────────────────────────────────────────────
// This viewer exists to diagnose DELIVERY and audit ATTRIBUTION, not to look up
// contacts — the CRM is for that, and the CRM-failure alert email already
// carries the full payload for manual recovery. So identities are masked: the
// page stays safe to screenshot, share in a ticket, or leave open on a laptop.
// Unmasking is a deliberate change, not a default.

/**
 * PII visibility is now a ROLE decision, not a module-boundary one.
 *
 * Masking stays the default for every role — the page remains safe to
 * screenshot, share in a ticket, or leave open on a laptop, which is why it
 * was built this way. What changed is that masking at the boundary meant even
 * an owner could not read the record they are accountable for, on a
 * READ-ONLY view, with no way to unmask short of opening Redis.
 *
 * The gate is the role on the server-derived session — never a prop, never a
 * query param, never client state. Callers that pass nothing keep the old
 * masked behaviour, so a forgotten argument fails CLOSED.
 *
 * See DECISIONS.md → "PII masking is role-gated, not absolute".
 */
export type PiiVisibility = "masked" | "full";

export function piiVisibilityForRole(role: string | undefined): PiiVisibility {
  return role === "owner" ? "full" : "masked";
}

export function maskEmail(email: string | undefined, visibility: PiiVisibility = "masked"): string {
  if (!email) return "—";
  if (visibility === "full") return email;
  const [user, domain] = email.split("@");
  if (!domain) return "—";
  const head = user.slice(0, 1);
  return `${head}${"•".repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

export function maskPhone(phone: string | undefined, visibility: PiiVisibility = "masked"): string {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 4) return "—";
  if (visibility === "full") return phone ?? "—";
  return `•••-•••-${d.slice(-4)}`;
}

/** First name only — enough to correlate with a CRM record, not a contact list. */
export function maskName(lead: StoredLead, visibility: PiiVisibility = "masked"): string {
  const first = lead.firstName || (lead.name ?? "").trim().split(/\s+/)[0];
  if (visibility === "full") return (lead.name ?? first ?? "").trim() || "—";
  return first ? `${first} ${"•".repeat(3)}` : "—";
}

// ── Expected non-delivery ────────────────────────────────────────────────────
//
// Some leads have NO CRM DESTINATION BY DESIGN. Counting those as failures
// makes a working system look broken — and it is the same category error the
// tone scale exists to prevent: this is `unknown`/expected, not `bad`.
//
// The waitlist is the case that matters. A waitlist signup is out-of-area, so
// there is no market to route it to and the CRM has nothing to match against;
// it answers 404. Since 2026-08-20 (commit 4169ad8) the lead route does not
// send them at all — `isWaitlist ? Promise.resolve(false) : postToCrm()` — and
// records crmAttempted: false. Entries written BEFORE that date were sent, did
// 404, and still carry crmAttempted: true with a 404 status. Those historical
// rows are what makes the failure count wrong today.
//
// This function is the single place that judgement is made, so the tiles, the
// row chips and the alert banner cannot disagree about what counts as broken.

export type ExpectedNonDelivery = { reason: string };

/**
 * Why this lead was never going to reach the CRM — or null when it should
 * have. Deliberately narrow: it only returns a reason it can PROVE from the
 * record, because the cost of wrongly calling a real failure "expected" is a
 * lost lead nobody chases.
 */
export function expectedNonDelivery(
  lead: StoredLead,
  d: DeliveryRecord | null
): ExpectedNonDelivery | null {
  if (lead.source === "waitlist") {
    return {
      reason:
        "Waitlist signup — out of area, so there is no market to route to and the CRM has nothing to match against. Not sent since 2026-08-20; earlier entries were sent and answered 404.",
    };
  }
  // A 404 on a lead carrying no market is the same shape of rejection: the CRM
  // could not find a destination. Narrowed to 404 specifically — a 5xx or an
  // auth failure on a marketless lead is still a real failure.
  if (d?.crmAttempted && !d.crmOk && d.crmStatus === 404 && !lead.market) {
    return {
      reason:
        "No market on the record, so the CRM had no destination to match and answered 404. Not a delivery failure — but worth knowing why the market never resolved.",
    };
  }
  return null;
}

/** Delivery state for display. "unknown" and "expected" are real, distinct
 *  states — neither is a failure and neither renders on the good/warn/bad
 *  ramp. Takes the lead as well as the record because whether a
 *  non-delivery was EXPECTED is a property of the lead, not the outcome. */
export function deliveryState(
  d: DeliveryRecord | null,
  lead?: StoredLead
): {
  label: string;
  tone: "ok" | "warn" | "fail" | "unknown";
  /** Present when tone is "unknown" because delivery was never going to
   *  happen. One line, shown on hover. */
  reason?: string;
} {
  const expected = lead ? expectedNonDelivery(lead, d) : null;
  if (expected) return { label: "not delivered (expected)", tone: "unknown", reason: expected.reason };

  if (!d) return { label: "unknown", tone: "unknown" };
  if (d.crmAttempted && d.crmOk) return { label: "delivered", tone: "ok" };
  if (d.crmAttempted && !d.crmOk) return { label: `CRM FAILED${d.crmStatus ? ` (${d.crmStatus})` : ""}`, tone: "fail" };
  if (!d.crmAttempted && d.persistOk) return { label: "stored, CRM not configured", tone: "warn" };
  return { label: "unknown", tone: "unknown" };
}
