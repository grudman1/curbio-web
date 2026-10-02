// ─────────────────────────────────────────────────────────────────────────────
// THE MERGED LEAD STORE — one read for every dashboard surface.
//
// Two sources, one list, one dedupe rule:
//
//   import   config/appLeadsSnapshot.json — the app snapshot through
//            SNAPSHOT_AS_OF (2026-08-29), channel-backfilled per spec §8.
//            Authoritative for every day up to and including asOf.
//   live     sell.curbio.com leads in Redis (lib/adminLeads.ts, READ-ONLY
//            token — this module cannot write to the lead store). A live lead
//            is Qualified when the website sent it to the app
//            (lib/leadSource.ts); only those submitted STRICTLY AFTER asOf are
//            appended.
//
// THE FENCE IS A UTC DATE COMPARE. Both sides are UTC, checked rather than
// assumed: the snapshot's "Created date" values are all `…+00:00` and the
// importer takes `slice(0, 10)` of them, and a lead's `submittedAt` is a
// `toISOString()` (`…Z`). Converting either side to Eastern would move leads
// across the fence: a lead at 9pm ET on Aug 29 is 01:00Z Aug 30, "after" in
// UTC — correct, because the snapshot's Aug 29 is a UTC day. Live rows carry no
// Deal ID to key on, so the date is the only dedupe there is.
//
// An export's own day is partial, so the refresh pipeline sets asOf to the day
// BEFORE the export and drops that day's deals (scripts/prepare-app-export.mjs,
// docs/app-snapshot-refresh.md). The 2026-08-29 snapshot predates that rule:
// its last record is 01:55Z that day, so the rest of Aug 29 UTC was in neither
// source until it was replaced.
//
// Live rows arrive with their channel derived from utm_source at submission —
// measured attribution, entryPoint web_form, stage Lead / status Open. When
// the live API connection lands, imported records are superseded by API data
// keyed on Deal ID and this merge retires with the snapshot.
//
// Wrapped in React cache(): every Hub screen reads this during one request and
// shares one Redis read — which is also what guarantees they AGREE.
// ─────────────────────────────────────────────────────────────────────────────

import { cache } from "react";
import { VALID_CHANNELS, type Channel } from "@/lib/channels";
import { MARKETS } from "@/config/markets";
import {
  SNAPSHOT_AS_OF,
  SNAPSHOT_DEALS,
  SNAPSHOT_MONTHS,
  type SnapshotDeal,
} from "@/config/appLeadsSnapshot";
import { readAllLeadRows, type StoredLead } from "@/lib/adminLeads";
import { classifyLive, needsAttention, sourceLabel, type AppStatus } from "@/lib/leadSource";

/** CRM market name ("Maryland") → the app market code the snapshot uses. */
const CRM_NAME_TO_APP_CODE: Record<string, string> = Object.fromEntries(
  MARKETS.map((m) => [m.crmName, m.appMarketCodes[0]])
);

const CHANNEL_SET: ReadonlySet<string> = new Set(VALID_CHANNELS);

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Every month the Hub can be scoped to: the snapshot's months, then each month
 *  up to and including the CURRENT one, so the picker opens on now rather than
 *  on the snapshot's last month. Computed per call — never at module scope,
 *  which would freeze "current" at whenever the instance booted. */
export function hubMonths(): string[] {
  const out = [...SNAPSHOT_MONTHS];
  const cur = todayUtc().slice(0, 7);
  let [y, m] = (out[out.length - 1] ?? cur).split("-").map(Number);
  while (`${y}-${String(m).padStart(2, "0")}` < cur) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

function liveToSnapshotDeal(lead: StoredLead, submitted: string, index: number): SnapshotDeal {
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

/** A live lead the app has not confirmed. Non-PII: never a name or email. */
export type AttentionItem = {
  leadId: string | null;
  date: string;
  market: string | null;
  source: string;
  status: AppStatus;
  /** The app's HTTP status, when it answered. */
  crmStatus: number | null;
};

export type LeadFeed = {
  /** Import + live leads sent to the app after asOf. Falls back to the import
   *  alone when Redis is unconfigured or erroring — a broken live read must
   *  never blank history. */
  deals: SnapshotDeal[];
  /** Newest lead date (UTC) seen in Redis after the snapshot — the freshness
   *  note. Null when there is no live data. */
  liveThrough: string | null;
  /** How far the data is good for pace math: today while the live read is
   *  healthy, else the snapshot date. */
  asOf: string;
  live: "ok" | "unconfigured" | "error";
  /** Post-snapshot live leads counted as Qualified, by what the app did. */
  counts: { qualified: number } & Partial<Record<AppStatus, number>>;
  /** Qualified live leads whose delivery failed or is unconfirmed. */
  attention: AttentionItem[];
};

export const leadFeed = cache(async (): Promise<LeadFeed> => {
  const result = await readAllLeadRows();
  if (!result.configured || result.error) {
    return {
      deals: SNAPSHOT_DEALS,
      liveThrough: null,
      asOf: SNAPSHOT_AS_OF,
      live: result.configured ? "error" : "unconfigured",
      counts: { qualified: 0 },
      attention: [],
    };
  }

  const today = todayUtc();
  const { qualified, liveThrough } = classifyLive(result.rows, { asOf: SNAPSHOT_AS_OF, now: Date.now() });
  const live: SnapshotDeal[] = [];
  const attention: AttentionItem[] = [];
  const counts: LeadFeed["counts"] = { qualified: 0 };

  for (const { lead, delivery, day, status, index } of qualified) {
    live.push(liveToSnapshotDeal(lead, day, index));
    counts.qualified += 1;
    counts[status] = (counts[status] ?? 0) + 1;
    if (needsAttention(status)) {
      attention.push({
        leadId: lead.leadId ?? null,
        date: day,
        market: lead.market ?? null,
        source: sourceLabel(lead),
        status,
        crmStatus: delivery?.crmStatus ?? null,
      });
    }
  }

  return {
    deals: live.length ? [...SNAPSHOT_DEALS, ...live] : SNAPSHOT_DEALS,
    liveThrough,
    asOf: today > SNAPSHOT_AS_OF ? today : SNAPSHOT_AS_OF,
    live: "ok",
    counts,
    attention,
  };
});

/** "app snapshot · through 2026-08-29 · live through 2026-09-14" — the source
 *  line every Qualified surface shows, so staleness is visible everywhere. */
export function feedLabel(feed: LeadFeed): string {
  const base = `app snapshot · through ${SNAPSHOT_AS_OF}`;
  if (feed.live !== "ok") return `${base} · live feed unavailable`;
  return feed.liveThrough ? `${base} · live through ${feed.liveThrough}` : `${base} · live, no newer leads`;
}

/** Import + live, deduped. Every Hub surface reads this, so they agree. */
export const mergedSnapshotDeals = cache(async (): Promise<SnapshotDeal[]> => (await leadFeed()).deals);
