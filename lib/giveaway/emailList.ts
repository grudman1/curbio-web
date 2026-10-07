import type { Giveaway, ListingAnswer } from "@/config/giveaways";
import { MARKET_BY_SLUG } from "@/config/markets";
import {
  isExcludedAddress,
  marketingContactsEnabled,
  sourceLabel,
  syncMarketingContact,
  type ListingTimeline,
} from "@/lib/marketingContacts";
import type { EmailListRouting, GiveawayEntry } from "./entry";

// ─────────────────────────────────────────────────────────────────────────────
// eXpcon → ActiveCampaign: the giveaway's adapter onto lib/marketingContacts.ts,
// the shared module every form uses. This file only decides WHO is synced and
// WHAT their contact looks like; how it is written (list, fields, tag, the
// existing-contact rules, fail-closed) lives in that module.
//
// Synced: entrants who ticked the email box (emailConsent === true). Never a
// manual (Add entry) entry, a test entry, a deleted entry, or an @example.com /
// @curbio.com address. Runs AFTER the entry is saved and after app delivery
// (service.ts), so a failure here never touches either — it is recorded on
// the entry, shown under "Needs attention", and "Sync now" retries it.
// ─────────────────────────────────────────────────────────────────────────────

export function emailListConfigured(): boolean {
  return marketingContactsEnabled();
}

const TIMELINE: Record<ListingAnswer, ListingTimeline> = {
  yes: "Within 90 days",
  maybe: "3-6 months",
  not_yet: "Not yet",
};

/** The day the box was ticked, in Mountain time (the event's clock). */
function consentDay(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export async function syncEntrantToEmailList(giveaway: Giveaway, entry: GiveawayEntry): Promise<EmailListRouting> {
  const at = new Date().toISOString();
  // Consent gate — the second lock (the first is wantsEmailList).
  if (entry.emailConsent !== true || entry.origin === "manual") return { status: "none", at };
  if (entry.isTest || entry.deletedAt || isExcludedAddress(entry.email)) return { status: "none", at };

  const market = entry.marketSlug ? MARKET_BY_SLUG[entry.marketSlug] : undefined;
  const a = entry.attribution;
  const result = await syncMarketingContact({
    email: entry.email,
    firstName: entry.firstName,
    lastName: entry.lastName,
    phone: entry.phone,
    contactType: "Agent",
    market: market?.displayName ?? "Not listed",
    brokerage: giveaway.emailList.brokerage,
    hsmName: market?.hsm.name ?? "",
    hsmEmail: market?.hsm.email ?? "",
    lifecycle: entry.routing.app.status === "sent" ? "Sales Qualified" : "Engaged",
    listingTimeline: TIMELINE[entry.listing90] ?? null,
    firstSource: sourceLabel(a.firstTouchChannel, a.firstTouchCampaign),
    latestSource: sourceLabel(a.channel, a.utm_campaign),
    consentSource: giveaway.emailList.consentSource,
    consentDate: consentDay(entry.emailConsentDetail?.at),
    tags: [giveaway.emailList.tag],
  });

  switch (result.status) {
    case "synced":
      return { status: "synced", at, contactId: result.contactId, listIds: result.listIds, error: null };
    case "unsubscribed":
      return { status: "unsubscribed", at, contactId: result.contactId, error: result.error };
    case "not_configured":
      return { status: "not_configured", at };
    case "skipped":
      return { status: "none", at };
    default:
      return { status: "failed", at, error: result.error };
  }
}
