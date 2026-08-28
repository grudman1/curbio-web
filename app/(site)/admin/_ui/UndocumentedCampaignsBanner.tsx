import type { CampaignOrphan } from "@/lib/campaignOrphans";

// Moved out of marketing/(hub)/hubUi.tsx (2026-08 nav redesign): it renders
// inside /admin (Attribution → Health, and Home's attention list references
// the same computation), so its canonical home is the admin design system.
// hubUi.tsx re-exports it so Links' own import is unchanged.

/**
 * Attribution hygiene surfaced wherever someone might act on it: Links (where
 * you document a tag), Attribution → Health (where the hole in coverage
 * shows), and one line in Home's "needs attention" list. Same computation
 * (lib/campaignOrphans.ts), same banner, three places.
 */
export function UndocumentedCampaignsBanner({
  orphans,
  leadWindow,
}: {
  orphans: CampaignOrphan[];
  leadWindow: number;
}) {
  if (orphans.length === 0) return null;
  return (
    <div className="mb-ops-gap rounded-lg border border-tone-warn bg-pill-warn-bg px-4 py-3">
      <p className="m-0 font-sans text-ops-body font-bold text-content">
        {orphans.length} campaign tag{orphans.length > 1 ? "s are" : " is"} producing leads but{" "}
        {orphans.length > 1 ? "aren't" : "isn't"} documented
      </p>
      <p className="m-0 mt-1 font-sans text-ops-label leading-[1.6] text-content-muted">
        {orphans.map((o) => `${o.campaign} (${o.count})`).join(" · ")} — computed against the last{" "}
        {leadWindow} leads at page load. Document each one in the Links registry so its
        performance has somewhere to live.
      </p>
    </div>
  );
}
