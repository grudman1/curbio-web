import { Redis } from "@upstash/redis";

// ─────────────────────────────────────────────────────────────────────────────
// Partner records — the Call Plan's rows, editable. The first object of the
// ops store (see DECISIONS.md → "Leads are measured; operational records are
// claimed"): ONE Upstash database, ops records under the `ops:` prefix,
// leads keys never touched by ops code.
//
// The schema is the Call Plan's own columns (partner, stage, next step, next
// step date, owner, agents reached, meetings) plus notes — the screen wrote
// the spec, this file just persists it.
//
// Reads use the READ-ONLY token (same rule as lib/adminLeads.ts: pages that
// render cannot mutate, enforced by the credential). Writes use the
// read-write token and happen ONLY inside the owner-checked server actions
// in app/(site)/marketing/(hub)/partners/actions.ts.
//
// No deletes, ever. A record leaves the plan via `archived: true`, so nothing
// is silently gone. Every write stamps who and when, and appends to the
// audit list — self-reported numbers are claims, and a claim without an
// author is not even a claim.
// ─────────────────────────────────────────────────────────────────────────────

const PARTNERS_KEY = "ops:partner:v1";
const AUDIT_KEY = "ops:partner:audit:v1";
const AUDIT_MAX = 2000; // capped — newest first, oldest trimmed

export type Partner = {
  id: string;
  name: string;
  /** Free text — the seed rows carry descriptions like "signed, dormant". */
  stage: string;
  /** Who at Curbio owns the relationship. */
  owner: string;
  nextStep: string;
  /** YYYY-MM-DD, or "" when no step is scheduled. */
  nextStepDate: string;
  notes: string;
  /** Self-reported counts — LOGGED, not measured. Null = never entered,
   *  which renders as a dash, never as zero. */
  agentsReached: number | null;
  meetingsBooked: number | null;
  /** Records never delete; they archive. */
  archived: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type PartnerAuditEntry = {
  at: string;
  by: string;
  partnerId: string;
  partnerName: string;
  action: "create" | "update" | "archive" | "unarchive";
};

function readOnlyRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

function readWriteRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export type OpsPartnersResult =
  | { configured: false }
  | { configured: true; partners: Partner[]; error: string | null };

export async function readOpsPartners(): Promise<OpsPartnersResult> {
  const redis = readOnlyRedis();
  if (!redis) return { configured: false };
  try {
    const hash = await redis.hgetall<Record<string, Partner | string>>(PARTNERS_KEY);
    const partners: Partner[] = [];
    for (const v of Object.values(hash ?? {})) {
      if (typeof v === "string") {
        try {
          partners.push(JSON.parse(v) as Partner);
        } catch {
          /* skip unparsable row rather than blanking the page */
        }
      } else if (v) {
        partners.push(v);
      }
    }
    return { configured: true, partners, error: null };
  } catch (err) {
    return {
      configured: true,
      partners: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Fetch one record — server actions use this so an update starts from the
 *  CURRENT stored state, never from what the client claims it was. */
export async function readOpsPartner(id: string): Promise<Partner | null> {
  const redis = readOnlyRedis();
  if (!redis) return null;
  const v = await redis.hget<Partner | string>(PARTNERS_KEY, id);
  if (!v) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as Partner;
    } catch {
      return null;
    }
  }
  return v;
}

/** Write path — owner-checked server actions only. Writes the record and its
 *  audit entry; the record write is the one that must succeed (the audit
 *  append is wrapped so a hiccup there never loses the edit itself). */
export async function writeOpsPartner(partner: Partner, audit: PartnerAuditEntry): Promise<void> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("ops store not configured");
  await redis.hset(PARTNERS_KEY, { [partner.id]: JSON.stringify(partner) });
  try {
    await redis.lpush(AUDIT_KEY, JSON.stringify(audit));
    await redis.ltrim(AUDIT_KEY, 0, AUDIT_MAX - 1);
  } catch {
    // Audit is diagnostics; diagnostics never outrank the record.
  }
}
