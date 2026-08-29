import type { Channel } from "@/lib/channels";
import type { TrackedLink } from "@/lib/marketingLinks";
import {
  inferChannelForCampaign,
  isTestCampaignTag,
  isUnsubstitutedPlaceholder,
} from "@/config/campaignHygiene";

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DOCUMENTED CAMPAIGNS — registry rows derived from campaign tags that
// actually produced leads, so the registry starts from what is really running
// instead of from an empty table someone is nagged to fill in.
//
// An auto row is EVIDENCE, not a decision. It records what was observed —
// first seen, lead count, the channel the leads themselves carried — and is
// flagged `origin: "auto"` everywhere it appears so it reads as "this is what
// the data says, confirm or correct it", never as a documented link someone
// authored. Creating a real registry row with the same campaign supersedes it.
//
// Nothing here is persisted: the rows are derived per request from the lead
// store and the app snapshot. That is deliberate — a generated file would go
// stale the moment traffic moved, and would need its own re-generation ritual.
// ─────────────────────────────────────────────────────────────────────────────

/** One campaign tag, as the data describes it. */
export type AutoDocumentedCampaign = {
  campaign: string;
  /** Earliest date the tag was seen on a lead, "YYYY-MM-DD". */
  firstSeen: string | null;
  lastSeen: string | null;
  /** Leads carrying the tag across every source consulted. */
  leadCount: number;
  channel: Channel;
  /** How the channel was arrived at — shown on review. */
  channelBasis: string;
  /** Market slugs/codes observed on the tag's leads. */
  markets: string[];
  /** The tag shipped with an unsubstituted template placeholder. */
  placeholder: boolean;
};

/** One observation of a campaign tag, from any source. */
export type CampaignSighting = {
  campaign: string;
  /** "YYYY-MM-DD" — when the lead arrived. */
  date: string | null;
  /** The channel the lead itself carried, when it carried one. */
  channel?: Channel | null;
  market?: string | null;
};

const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

/**
 * Fold sightings into one auto-documented row per campaign.
 *
 * Test tags are dropped here rather than filtered downstream, so no surface
 * can accidentally render them: the exclusion happens once, at the boundary.
 * `documented` tags are dropped too — a real registry row always wins.
 */
export function deriveAutoDocumentedCampaigns(
  sightings: CampaignSighting[],
  documented: ReadonlySet<string>
): AutoDocumentedCampaign[] {
  const groups = new Map<string, CampaignSighting[]>();
  for (const s of sightings) {
    const tag = s.campaign.trim();
    if (!tag || isTestCampaignTag(tag) || documented.has(tag)) continue;
    groups.set(tag, [...(groups.get(tag) ?? []), s]);
  }

  return [...groups.entries()]
    .map(([campaign, rows]): AutoDocumentedCampaign => {
      const dates = rows.map((r) => r.date).filter((d): d is string => !!d).sort();

      // The channel the leads themselves carried, by plurality. Only when no
      // lead carries one do we fall back to guessing from the tag's shape.
      const observed = new Map<string, number>();
      for (const r of rows) if (r.channel) bump(observed, r.channel);
      const top = [...observed.entries()].sort((a, b) => b[1] - a[1])[0];

      const { channel, why } = top
        ? {
            channel: top[0] as Channel,
            why: `observed on ${top[1]} of ${rows.length} lead${rows.length === 1 ? "" : "s"}`,
          }
        : inferChannelForCampaign(campaign);

      return {
        campaign,
        firstSeen: dates[0] ?? null,
        lastSeen: dates[dates.length - 1] ?? null,
        leadCount: rows.length,
        channel,
        channelBasis: why,
        markets: [...new Set(rows.map((r) => r.market).filter((m): m is string => !!m))].sort(),
        placeholder: isUnsubstitutedPlaceholder(campaign),
      };
    })
    .sort((a, b) => b.leadCount - a.leadCount || a.campaign.localeCompare(b.campaign));
}

/** Render an auto row as a registry row, so the Links table can show it in
 *  place with everything else. `origin: "auto"` is what marks it unreviewed. */
export function autoDocumentedLink(c: AutoDocumentedCampaign): TrackedLink {
  const marketNote = c.markets.length ? c.markets.join(", ") : "unknown";
  return {
    id: `auto:${c.campaign}`,
    label: c.campaign,
    type: "unclassified",
    owner: "unassigned",
    channel: c.channel,
    medium: "",
    campaign: c.campaign,
    market: c.markets.length === 1 ? c.markets[0] : "all",
    destination: "",
    trackedUrl: "",
    shortLink: "",
    // The tag produced leads, so whatever link carries it is live by evidence.
    status: "live",
    notes:
      `Auto-documented from lead traffic — not yet reviewed. ` +
      `${c.leadCount} lead${c.leadCount === 1 ? "" : "s"}, ` +
      `first seen ${c.firstSeen ?? "unknown"}, markets: ${marketNote}. ` +
      `Channel ${c.channel} — ${c.channelBasis}.` +
      (c.placeholder
        ? " ⚠ The tag still contains a template placeholder, so its market token was never substituted — the link that produced these leads is mis-tagged at the source."
        : ""),
    createdAt: c.firstSeen,
    origin: "auto",
  };
}
