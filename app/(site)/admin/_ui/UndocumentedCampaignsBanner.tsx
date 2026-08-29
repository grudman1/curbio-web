import type { AutoDocumentedCampaign } from "@/lib/campaignAutoDoc";
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
 *
 * The banner asks for two different things and must not conflate them. An
 * ORPHAN is a tag nobody can account for — an alarm. An AUTO-DOCUMENTED tag
 * has already been described from its own lead traffic and only needs a human
 * to confirm the guess — a review queue, and reviewing is cheaper than
 * documenting from scratch, so it is not styled as a failure. Test tags are
 * named and counted but never demand anything: excluding them silently would
 * be its own kind of dishonesty.
 */
export function UndocumentedCampaignsBanner({
  orphans,
  autoDocumented = [],
  testTags = [],
  leadWindow,
}: {
  orphans: CampaignOrphan[];
  autoDocumented?: AutoDocumentedCampaign[];
  testTags?: CampaignOrphan[];
  leadWindow: number;
}) {
  if (orphans.length === 0 && autoDocumented.length === 0) return null;

  const alarm = orphans.length > 0;
  const excluded = testTags.length > 0 && (
    <>
      {" "}
      {testTags.length} QA test tag{testTags.length > 1 ? "s" : ""} excluded (
      {testTags.map((t) => t.campaign).join(", ")}).
    </>
  );

  return (
    <div
      className={
        "mb-ops-gap rounded-lg border px-4 py-3 " +
        (alarm ? "border-tone-warn bg-pill-warn-bg" : "border-app-border bg-app-surface-2")
      }
    >
      {alarm && (
        <>
          <p className="m-0 font-sans text-ops-body font-bold text-content">
            {orphans.length} campaign tag{orphans.length > 1 ? "s are" : " is"} producing leads but{" "}
            {orphans.length > 1 ? "aren't" : "isn't"} documented
          </p>
          <p className="m-0 mt-1 font-sans text-ops-label leading-[1.6] text-content-muted">
            {orphans.map((o) => `${o.campaign} (${o.count})`).join(" · ")} — document each one in
            the Links registry so its performance has somewhere to live.
          </p>
        </>
      )}

      {autoDocumented.length > 0 && (
        <>
          <p
            className={
              "m-0 font-sans text-ops-body font-bold text-content " + (alarm ? "mt-3" : "")
            }
          >
            {autoDocumented.length} campaign tag{autoDocumented.length > 1 ? "s" : ""}{" "}
            auto-documented from lead traffic — awaiting review
          </p>
          <p className="m-0 mt-1 font-sans text-ops-label leading-[1.6] text-content-muted">
            {autoDocumented
              .map(
                (c) =>
                  `${c.campaign} (${c.leadCount} lead${c.leadCount === 1 ? "" : "s"}, ${c.channel})`
              )
              .join(" · ")}
            . Channel and market are inferred from the leads themselves, not authored — open Links
            to confirm or correct each row.
          </p>
        </>
      )}

      <p className="m-0 mt-2 font-sans text-ops-label leading-[1.6] text-content-subtle">
        Computed against the last {leadWindow} leads plus the app snapshot, at page load.
        {excluded}
      </p>
    </div>
  );
}
