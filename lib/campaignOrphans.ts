import { SEED_LINKS } from "@/config/linkRegistry";
import { readRegistryLinks } from "./marketingLinksStore";
import { readRecentLeads } from "./adminLeads";

// ─────────────────────────────────────────────────────────────────────────────
// Attribution hygiene, not link management — so it is computed once and read
// from three surfaces (Links, Attribution → Health, Home's "what's broken"
// list) rather than reimplemented per screen. A campaign tag is "documented"
// when some row in the Links registry (seed or Redis) carries it; an orphan is
// a tag producing leads that no row documents.
//
// readRecentLeads is React-cache()'d per request, so calling this alongside
// the Links page's own richer per-campaign join (LinksTable needs the actual
// lead rows, not just counts) does not cost a second Redis read when both run
// in the same render.
// ─────────────────────────────────────────────────────────────────────────────

export type CampaignOrphan = { campaign: string; count: number };

export async function computeUndocumentedCampaigns(
  scan: number
): Promise<{ orphans: CampaignOrphan[]; leadJoinAvailable: boolean }> {
  const [registry, leads] = await Promise.all([readRegistryLinks(), readRecentLeads(scan)]);
  const registryLinks = registry.configured && !registry.error ? registry.links : [];
  const documented = new Set([...registryLinks, ...SEED_LINKS].map((r) => r.campaign).filter(Boolean));

  const leadJoinAvailable = leads.configured && !leads.error;
  const counts: Record<string, number> = {};
  if (leadJoinAvailable) {
    for (const { lead } of leads.rows) {
      const campaign = lead.utm_campaign?.trim();
      if (!campaign) continue;
      counts[campaign] = (counts[campaign] ?? 0) + 1;
    }
  }

  const orphans = Object.entries(counts)
    .filter(([campaign]) => !documented.has(campaign))
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count);

  return { orphans, leadJoinAvailable };
}
