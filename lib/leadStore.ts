// ─────────────────────────────────────────────────────────────────────────────
// THE MERGED LEAD STORE — one read for every dashboard surface.
//
// Two sources, one list, one dedupe rule:
//
//   import   config/appLeadsSnapshot.json — the app snapshot through
//            SNAPSHOT_AS_OF (2026-08-29), channel-backfilled per spec §8.
//            Authoritative for every day up to and including asOf.
//   live     sell.curbio.com form submissions in Redis (lib/adminLeads.ts).
//            Only estimate requests (never waitlist) submitted STRICTLY AFTER
//            asOf are appended — anything on or before asOf is already in the
//            import (the import is preferred for historical months; live rows
//            carry no Deal ID to key on, so the snapshot date is the fence).
//
// Live rows arrive with their channel derived from utm_source at submission —
// measured attribution, entryPoint web_form, stage Lead / status Open. When
// the live API connection lands, imported records are superseded by API data
// keyed on Deal ID and this merge retires with the snapshot.
//
// Wrapped in React cache(): Home, Attribution, the Email channel page and
// Performance all read this during one request and share one Redis read —
// which is also what guarantees they AGREE.
// ─────────────────────────────────────────────────────────────────────────────

import { cache } from "react";
import { VALID_CHANNELS, type Channel } from "@/lib/channels";
import { MARKETS } from "@/config/markets";
import {
  SNAPSHOT_AS_OF,
  SNAPSHOT_DEALS,
  type SnapshotDeal,
} from "@/config/appLeadsSnapshot";
import { readRecentLeads, type StoredLead } from "@/lib/adminLeads";

/** CRM market name ("Maryland") → the app market code the snapshot uses. */
const CRM_NAME_TO_APP_CODE: Record<string, string> = Object.fromEntries(
  MARKETS.map((m) => [m.crmName, m.appMarketCodes[0]])
);

const CHANNEL_SET: ReadonlySet<string> = new Set(VALID_CHANNELS);

function liveToSnapshotDeal(lead: StoredLead, index: number): SnapshotDeal | null {
  const submitted = (lead.submittedAt ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(submitted)) return null;
  // The fence: on/before asOf the import is authoritative — never both.
  if (submitted <= SNAPSHOT_AS_OF) return null;
  // Estimate requests only — a waitlist signup is Engaged, not Qualified.
  if (lead.source === "waitlist") return null;

  const channel: Channel =
    lead.channel && CHANNEL_SET.has(lead.channel) ? (lead.channel as Channel) : "direct";

  return {
    dealId: lead.leadId ? `live:${lead.leadId}` : `live:${submitted}:${index}`,
    marketCode: (lead.market && CRM_NAME_TO_APP_CODE[lead.market]) ?? "",
    date: submitted,
    month: submitted.slice(0, 7),
    stage: "Lead",
    status: "Open",
    referralSource: lead.referralSourceId ?? "",
    dealType: "Seller",
    value: null,
    channel,
    entryPoint: "web_form",
    // Captured at submission by the web door — real signal, never mapped.
    attribution: "measured",
    utmSource: lead.utm_source ?? undefined,
    utmMedium: lead.utm_medium ?? undefined,
    utmCampaign: lead.utm_campaign ?? undefined,
    utmContent: lead.utm_content ?? undefined,
  };
}

/** Import + live, deduped. Falls back to the import alone when Redis is
 *  unconfigured or erroring — a broken live read must never blank history. */
export const mergedSnapshotDeals = cache(async (): Promise<SnapshotDeal[]> => {
  const result = await readRecentLeads(200);
  if (!result.configured || result.error) return SNAPSHOT_DEALS;
  const live = result.rows
    .map(({ lead }, i) => liveToSnapshotDeal(lead, i))
    .filter((d): d is SnapshotDeal => d !== null);
  return live.length ? [...SNAPSHOT_DEALS, ...live] : SNAPSHOT_DEALS;
});
