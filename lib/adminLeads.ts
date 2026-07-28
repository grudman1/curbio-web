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

/** Newest `limit` leads, joined with their delivery outcome. */
export async function readRecentLeads(limit = 50): Promise<LeadsResult> {
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
}

// ── PII minimisation ─────────────────────────────────────────────────────────
// This viewer exists to diagnose DELIVERY and audit ATTRIBUTION, not to look up
// contacts — the CRM is for that, and the CRM-failure alert email already
// carries the full payload for manual recovery. So identities are masked: the
// page stays safe to screenshot, share in a ticket, or leave open on a laptop.
// Unmasking is a deliberate change, not a default.

export function maskEmail(email: string | undefined): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return "—";
  const head = user.slice(0, 1);
  return `${head}${"•".repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

export function maskPhone(phone: string | undefined): string {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 4) return "—";
  return `•••-•••-${d.slice(-4)}`;
}

/** First name only — enough to correlate with a CRM record, not a contact list. */
export function maskName(lead: StoredLead): string {
  const first = lead.firstName || (lead.name ?? "").trim().split(/\s+/)[0];
  return first ? `${first} ${"•".repeat(3)}` : "—";
}

/** Delivery state for display. "unknown" is a real, distinct state. */
export function deliveryState(d: DeliveryRecord | null): {
  label: string;
  tone: "ok" | "warn" | "fail" | "unknown";
} {
  if (!d) return { label: "unknown", tone: "unknown" };
  if (d.crmAttempted && d.crmOk) return { label: "delivered", tone: "ok" };
  if (d.crmAttempted && !d.crmOk) return { label: `CRM FAILED${d.crmStatus ? ` (${d.crmStatus})` : ""}`, tone: "fail" };
  if (!d.crmAttempted && d.persistOk) return { label: "stored, CRM not configured", tone: "warn" };
  return { label: "unknown", tone: "unknown" };
}
