import { skeletonHeroCopy } from "./SkeletonHeroCopy";
import type { CampaignPage } from "@/config/campaigns/types";
import { CoBrandMark } from "./campaign/CampaignShell";
import { NEUTRAL_MARKET } from "@/lib/campaignMarkets";

// Layout-matching skeleton for the /exp co-branded page. Rendered into the
// prerendered HTML of /exp (see components/ExpHomeClient.tsx), so it IS the
// first paint for visitors who need client-side resolution.
// With `hero`, the headline/subhead/trust row ship as real text — see
// PageSkeleton. With `partnerId` too, the co-brand lockup is the real one with
// only its market-naming serving line greyed, so the headline sits exactly
// where the resolved page puts it. The form stays grey.
export default function ExpPageSkeleton({
  hero,
  partnerId,
}: { hero?: CampaignPage["hero"]; partnerId?: string } = {}) {
  const copy = skeletonHeroCopy(hero);
  return (
    <div aria-hidden={copy ? undefined : true}>
      <header className="lp-header">
        <div className="lp-shell lp-header-inner">
          <div className="exp-header-logos">
            {/* Real logo — <img> triggers FCP; the SVG needs no optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/curbio-white.svg" alt="Curbio" className="lp-header-logo" width={100} height={26} />
            <div style={{ width: 1, height: 22, background: "var(--navy-85)" }} />
            <div style={{ height: 20, width: 120, background: "var(--navy-85)", borderRadius: 3 }} />
          </div>
          <div aria-hidden style={{ height: 32, width: 140, background: "var(--navy-85)", borderRadius: 999 }} />
        </div>
      </header>
      <main>
        <section className="lp-hero">
          <div className="lp-shell lp-hero-grid">
            <div className="lp-hero-copy">
              {copy && partnerId ? (
                <CoBrandMark partnerId={partnerId} market={NEUTRAL_MARKET} neutral servingPlaceholder />
              ) : (
                <div style={{ height: 14, width: 160, background: "var(--stone)", borderRadius: 4, marginBottom: 18 }} />
              )}
              {copy ?? (
                <>
                  <div style={{ height: 100, width: "85%", background: "var(--stone)", borderRadius: 6, marginBottom: 22 }} />
                  <div style={{ height: 44, width: "65%", background: "var(--stone)", borderRadius: 4 }} />
                </>
              )}
            </div>
            <div className="lp-hero-form-col">
              {/* 426 = the real form card once a market is known; the copy column is
                  vertically centred against it on desktop, so a mismatch moves the
                  headline on resolve. */}
              <div aria-hidden style={{ height: 426, background: "var(--stone)", borderRadius: 12 }} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
