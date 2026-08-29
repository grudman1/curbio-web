import { SEED_LINKS } from "@/config/linkRegistry";
import { SNAPSHOT_DEALS } from "@/config/appLeadsSnapshot";
import { isTestCampaignTag } from "@/config/campaignHygiene";
import { readRegistryLinks } from "./marketingLinksStore";
import { readRecentLeads } from "./adminLeads";
import {
  deriveAutoDocumentedCampaigns,
  type AutoDocumentedCampaign,
  type CampaignSighting,
} from "./campaignAutoDoc";
import type { Channel } from "./channels";

// ─────────────────────────────────────────────────────────────────────────────
// Attribution hygiene, not link management — so it is computed once and read
// from three surfaces (Links, Attribution → Health, Home's "what's broken"
// list) rather than reimplemented per screen. A campaign tag is "documented"
// when some row in the Links registry (seed or Redis) carries it.
//
// What an undocumented tag MEANS was the problem. The check used to report
// every unknown tag as work someone owed, and over half of them were our own
// QA runs — so the number was mostly self-inflicted noise, and a list that is
// mostly noise gets ignored. Tags now sort into three piles:
//
//   testTags        QA artifacts (config/campaignHygiene.ts). Excluded from
//                   the count entirely — nobody documents a test — but still
//                   returned, so "excluded" is visible rather than silent.
//   autoDocumented  Real tags with real leads, described from the evidence
//                   (first seen, lead count, observed channel) and flagged for
//                   review. These are answers awaiting confirmation, not debts.
//   orphans         What is left: a real tag we could not even describe.
//
// Sightings come from the live lead store AND the app snapshot, because the
// email program's tags reach leads through the historical import, not only
// through recent form traffic — counting one source would understate both the
// lead counts and the first-seen dates.
//
// readRecentLeads is React-cache()'d per request, so calling this alongside
// the Links page's own richer per-campaign join does not cost a second read.
// ─────────────────────────────────────────────────────────────────────────────

export type CampaignOrphan = { campaign: string; count: number };

export type CampaignHygiene = {
  /** Real tags with no registry row that we could not describe. */
  orphans: CampaignOrphan[];
  /** Real tags described from evidence, awaiting review. */
  autoDocumented: AutoDocumentedCampaign[];
  /** QA artifacts excluded from the count, kept for transparency. */
  testTags: CampaignOrphan[];
  leadJoinAvailable: boolean;
};

export async function computeUndocumentedCampaigns(scan: number): Promise<CampaignHygiene> {
  const [registry, leads] = await Promise.all([readRegistryLinks(), readRecentLeads(scan)]);
  const registryLinks = registry.configured && !registry.error ? registry.links : [];
  const documented = new Set(
    [...registryLinks, ...SEED_LINKS].map((r) => r.campaign).filter(Boolean)
  );

  const leadJoinAvailable = leads.configured && !leads.error;

  // Source 1 — the live lead store (recent form traffic).
  const sightings: CampaignSighting[] = [];
  if (leadJoinAvailable) {
    for (const { lead } of leads.rows) {
      const campaign = lead.utm_campaign?.trim();
      if (!campaign) continue;
      sightings.push({
        campaign,
        date: (lead.submittedAt ?? "").slice(0, 10) || null,
        channel: (lead.channel as Channel | undefined) ?? null,
        market: lead.market ?? null,
      });
    }
  }

  // Source 2 — the app snapshot, but ONLY rows carrying a real UTM campaign.
  //
  // Most snapshot campaign values did not come off a link: the spec-§8 backfill
  // mints partner names as campaigns (lonewolf, Long&FosterLift, KWOfferings),
  // and the Mailchimp pass assigns slugs by send-time correlation. Both are
  // inferences OF OURS. Auto-documenting them would write our own guesses into
  // the Links registry as though a link existed and someone had confirmed it —
  // the exact "never present inferred as tracked" failure the attribution work
  // exists to prevent. A registry row must trace to a link that really emitted
  // the tag, so only measured rows qualify.
  for (const deal of SNAPSHOT_DEALS) {
    const campaign = deal.utmCampaign?.trim();
    if (!campaign || deal.attribution !== "measured") continue;
    sightings.push({
      campaign,
      date: deal.date,
      channel: deal.channel,
      market: deal.marketCode,
    });
  }

  const testCounts = new Map<string, number>();
  for (const s of sightings) {
    if (isTestCampaignTag(s.campaign)) {
      testCounts.set(s.campaign, (testCounts.get(s.campaign) ?? 0) + 1);
    }
  }

  const autoDocumented = deriveAutoDocumentedCampaigns(sightings, documented);

  // Anything real that auto-documentation could not describe. It describes
  // every tag it is given, so this is normally empty — it exists so a future
  // shape we cannot characterise still surfaces instead of vanishing.
  const described = new Set(autoDocumented.map((c) => c.campaign));
  const orphanCounts = new Map<string, number>();
  for (const s of sightings) {
    const tag = s.campaign.trim();
    if (!tag || documented.has(tag) || described.has(tag) || isTestCampaignTag(tag)) continue;
    orphanCounts.set(tag, (orphanCounts.get(tag) ?? 0) + 1);
  }

  const toRows = (m: Map<string, number>): CampaignOrphan[] =>
    [...m.entries()]
      .map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count || a.campaign.localeCompare(b.campaign));

  return {
    orphans: toRows(orphanCounts),
    autoDocumented,
    testTags: toRows(testCounts),
    leadJoinAvailable,
  };
}
