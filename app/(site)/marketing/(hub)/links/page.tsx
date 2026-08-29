import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { LINK_SEED_EXPORTED_AT, SEED_LINKS } from "@/config/linkRegistry";
import { readRegistryLinks } from "@/lib/marketingLinksStore";
import { readRecentLeads, maskName } from "@/lib/adminLeads";
import { computeUndocumentedCampaigns } from "@/lib/campaignOrphans";
import { autoDocumentedLink } from "@/lib/campaignAutoDoc";
import { SCAN } from "@/app/(site)/admin/(dashboard)/ui";
import { HubPageHeader, NeedsBlock } from "../hubUi";
import { LinksTable, type LeadLite } from "./LinksTable";

// ─────────────────────────────────────────────────────────────────────────────
// Links — every tracked link Curbio has in the world, in one table, with its
// performance attached. Seeded from the WordPress redirect export and the HSM
// business cards, so it starts as a true inventory; rows created here live in
// Redis. The orphan check at the top compares campaign tags seen in real lead
// traffic against the registry — how the registry stays honest instead of
// decaying into a stale spreadsheet.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Links · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.links;

export default async function LinksPage() {
  const registry = await readRegistryLinks();
  const registryLinks = registry.configured && !registry.error ? registry.links : [];
  const rows = [...registryLinks, ...SEED_LINKS];
  const registryIssue = !registry.configured
    ? "Link store not configured in this environment — rows created in the UI won't appear."
    : registry.error
      ? `Link store unreadable: ${registry.error} — seed rows shown; UI-created rows are temporarily missing.`
      : null;

  // ── join: estimate requests carrying each utm_campaign ────────────────────
  // The lead store keeps the last N leads; this is a windowed join and every
  // number it produces is labeled with that window. Identities stay masked —
  // same PII stance as the Leads tab.
  const leads = await readRecentLeads(SCAN);
  const campaignLeads: Record<string, LeadLite[]> = {};
  if (leads.configured && !leads.error) {
    for (const { lead } of leads.rows) {
      const campaign = lead.utm_campaign?.trim();
      if (!campaign) continue;
      (campaignLeads[campaign] ??= []).push({
        date: (lead.submittedAt ?? "").slice(0, 10) || "?",
        name: maskName(lead),
        market: lead.market ?? null,
        entryPoint: lead.entryPoint ?? null,
        channel: lead.channel ?? null,
        firstTouchChannel: lead.firstTouchChannel ?? null,
      });
    }
  }

  // ── orphans: campaign tags in the wild with no registry row ──────────────
  // Shared with Attribution → Health and Home (lib/campaignOrphans.ts) — same
  // computation, same "documented" set, three surfaces. readRecentLeads is
  // cache()'d per request, so this costs nothing extra alongside the richer
  // per-campaign join above.
  const { orphans, autoDocumented, testTags } = await computeUndocumentedCampaigns(SCAN);

  // Auto-documented tags render as rows in the table itself, not only as a
  // banner above it: reviewing one means looking at it next to the links it
  // sits among. They sort last — evidence awaiting confirmation, below every
  // row a person actually authored.
  const autoRows = autoDocumented.map(autoDocumentedLink);

  return (
    <>
      <HubPageHeader surface={surface} />
      <LinksTable
        rows={[...rows, ...autoRows]}
        autoDocumented={autoDocumented}
        testTags={testTags}
        campaignLeads={campaignLeads}
        leadWindow={SCAN}
        leadJoinAvailable={leads.configured && !leads.error}
        seedExportedAt={LINK_SEED_EXPORTED_AT}
        registryIssue={registryIssue}
        orphans={orphans}
      />
      <NeedsBlock surface={surface} />
    </>
  );
}
