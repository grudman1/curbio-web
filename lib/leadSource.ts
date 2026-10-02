// ─────────────────────────────────────────────────────────────────────────────
// QUALIFIED = the website sent this person to the app (the CRM).
//
// That is a sales-qualified lead, and it is decided by what happened to the
// lead, never by where it came from. `source` is kept only as a label for
// breakdowns — an allowlist of sources was the first version of this rule and
// it was wrong in both directions: it would have dropped a new campaign's
// leads until someone listed it, and it said nothing about whether the app
// ever received them.
//
// The evidence is the delivery record the lead route (and the giveaway's own
// hand-off, lib/giveaway/appDelivery.ts) writes next to every lead:
//
//   leads:v1            the lead itself — one row per person handed to the app
//   leads:delivery:v1   HASH leadId → { crmAttempted, crmOk, crmStatus,
//                       unroutable, recordedAt }
//
// What never reaches leads:v1, and so is never Qualified here:
//   waitlist signups      their own list, waitlist:leads
//   eXpcon giveaway       entries live under giveaway:<slug>:*; ONLY an entrant
//                         handed to an HSM (answered Yes, booked, or used the
//                         contact form after close) is also written to
//                         leads:v1. A "Maybe" or "Not yet" never is.
//   toolkits, webinars    /api/intake is not wired
//
// A lead whose delivery FAILED or has not been confirmed is still Qualified —
// the person asked for an estimate — and is listed as NEEDS ATTENTION so it
// gets chased instead of silently counted as fine or silently dropped.
// ─────────────────────────────────────────────────────────────────────────────

import type { DeliveryRecord, StoredLead } from "@/lib/adminLeads";

type LeadRowLike = { lead: StoredLead; delivery: DeliveryRecord | null };

export type AppStatus =
  /** The app accepted it. */
  | "sent"
  /** Written moments ago; the delivery record has not landed yet. */
  | "pending"
  /** Predates the delivery log entirely, so nothing can be said either way. */
  | "legacy"
  /** The app refused it or never answered. */
  | "failed"
  /** The app took it but it had no market and no ZIP, so nothing can route it. */
  | "unroutable"
  /** The lead route had no CRM webhook to call. */
  | "not-sent"
  /** Past the grace period with no delivery record at all. */
  | "unconfirmed";

const NEEDS_ATTENTION: ReadonlySet<AppStatus> = new Set(["failed", "unroutable", "not-sent", "unconfirmed"]);

export function needsAttention(status: AppStatus): boolean {
  return NEEDS_ATTENTION.has(status);
}

/** How long a lead may lack its delivery record before that is a finding. The
 *  route writes the record in the same request, seconds after the lead. */
const PENDING_GRACE_MS = 10 * 60_000;

/** Is this a lead the website sent to the app? Null = not Qualified. Every row
 *  in leads:v1 is one, except a waitlist row (defensive: they live elsewhere). */
export function appStatus(
  lead: StoredLead,
  delivery: DeliveryRecord | null,
  ctx: { deliveryLogStart: string | null; now: number }
): AppStatus | null {
  if (lead.source === "waitlist") return null;
  if (delivery) {
    if (!delivery.crmAttempted) return "not-sent";
    if (!delivery.crmOk) return "failed";
    return delivery.unroutable === true ? "unroutable" : "sent";
  }
  const at = Date.parse(lead.submittedAt ?? "");
  if (Number.isFinite(at) && ctx.now - at < PENDING_GRACE_MS) return "pending";
  // No record, and the delivery log did not exist yet when this was written.
  if (ctx.deliveryLogStart && lead.submittedAt && lead.submittedAt < ctx.deliveryLogStart) return "legacy";
  return "unconfirmed";
}

/** The earliest delivery record's timestamp — when the log began. */
export function deliveryLogStart(deliveries: Iterable<DeliveryRecord>): string | null {
  let first: string | null = null;
  for (const d of deliveries) {
    const t = d.submittedAt ?? d.recordedAt;
    if (t && (!first || t < first)) first = t;
  }
  return first;
}

/** Label only — never a rule. "eXpcon · booked", or the raw source. */
export function sourceLabel(lead: StoredLead): string {
  return lead.giveaway ? `giveaway:${lead.giveaway}${lead.appReason ? ` (${lead.appReason})` : ""}` : lead.source ?? "quote";
}

/** "2026-09-14" in UTC, or null for an unparseable timestamp. UTC on purpose:
 *  see the fence note in lib/leadStore.ts. */
export function utcDate(iso: string | undefined | null): string | null {
  const t = Date.parse(iso ?? "");
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

export type ClassifiedLead = {
  lead: StoredLead;
  delivery: DeliveryRecord | null;
  /** UTC submission date. */
  day: string;
  status: AppStatus;
  index: number;
};

/** The live half of the merge, as a pure function: every row of leads:v1,
 *  fenced at `asOf` (strictly after), de-duplicated by leadId, and reduced to
 *  the ones the website sent to the app. */
export function classifyLive(
  rows: readonly LeadRowLike[],
  opts: { asOf: string; now: number }
): { qualified: ClassifiedLead[]; liveThrough: string | null } {
  const today = new Date(opts.now).toISOString().slice(0, 10);
  const logStart = deliveryLogStart(rows.flatMap((r) => (r.delivery ? [r.delivery] : [])));
  const seen = new Set<string>();
  const qualified: ClassifiedLead[] = [];
  let liveThrough: string | null = null;

  rows.forEach(({ lead, delivery }, index) => {
    const day = utcDate(lead.submittedAt);
    // The fence: on/before asOf the import is authoritative — never both.
    if (!day || day <= opts.asOf) return;
    if (day <= today && (!liveThrough || day > liveThrough)) liveThrough = day;
    const status = appStatus(lead, delivery, { deliveryLogStart: logStart, now: opts.now });
    if (!status) return;
    // A duplicate leadId is the same submission — never count it twice.
    if (lead.leadId) {
      if (seen.has(lead.leadId)) return;
      seen.add(lead.leadId);
    }
    qualified.push({ lead, delivery, day, status, index });
  });
  return { qualified, liveThrough };
}
