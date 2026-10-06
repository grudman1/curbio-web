import { skeletonHeroCopy, SkeletonEyebrow } from "./SkeletonHeroCopy";
import type { CampaignPage } from "@/config/campaigns/types";

// Layout-matching skeleton shown while market resolution is in flight.
// Rendered into the prerendered HTML of `/` (see components/HomeClient.tsx),
// so it IS the first paint for visitors who need client-side resolution.
//
// With `hero`, the market-independent copy (headline — the LCP element —
// subhead, trust row) is REAL text in the HTML; only the market-dependent
// parts (header picker, eyebrow, form) stay grey. Without it, the old
// all-grey skeleton.
export default function PageSkeleton({ hero }: { hero?: CampaignPage["hero"] } = {}) {
  const copy = skeletonHeroCopy(hero);
  return (
    // Hidden from assistive tech only while it is ALL placeholder; once the
    // real headline is in it, only the grey parts are hidden.
    <div aria-hidden={copy ? undefined : true}>
      <header className="lp-header">
        <div className="lp-shell lp-header-inner">
          {/* Real logo — <img> triggers FCP so the browser doesn't wait for
              resolved content. Colored divs don't count as "contentful". */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/curbio-white.svg" alt="Curbio" className="lp-header-logo" width={100} height={26} />
          <div aria-hidden style={{ height: 32, width: 140, background: "var(--navy-85)", borderRadius: 999 }} />
        </div>
      </header>
      <main>
        <section className="lp-hero">
          <div className="lp-shell lp-hero-grid">
            <div className="lp-hero-copy">
              {copy && hero ? (
                <SkeletonEyebrow hero={hero} />
              ) : (
                <div style={{ height: 14, width: 110, background: "var(--stone)", borderRadius: 4, marginBottom: 18 }} />
              )}
              {copy ?? (
                <>
                  <div style={{ height: 100, width: "85%", background: "var(--stone)", borderRadius: 6, marginBottom: 22 }} />
                  <div style={{ height: 3, width: 48, background: "var(--stone)", marginBottom: 22 }} />
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
