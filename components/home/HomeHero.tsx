// Hero — EDITORIAL SPLIT (Gavin, Aug 21). Copy left on a solid ground, art
// right. Replaces the v1 full-bleed photo hero.
//
// WHY THE PHOTO IS GONE, and what went with it. The photo was the LCP element
// and it dragged a whole apparatus behind it: a two-layer scrim, text-shadows
// on four separate layers, and a documented WCAG shortfall (subhead ~3.1:1,
// field label ~3.6:1 against the flat wash — see the scrim note that used to
// live in home.css). On a solid surface all of that is deleted rather than
// tuned: navy on Cloud White measures ~13:1, so the shadows come off, the
// scrim is gone, and there is no LCP image at all.
//
// It also settles the standing objection recorded against the old hero: an
// after-only exterior shows a house that needs no work, so the image argued
// against the product. The right column is now a marked placeholder, so
// whatever lands there is a deliberate choice rather than an inherited one.
//
// data-dark is REMOVED, and that is load-bearing, not tidying. It is what puts
// the fixed header into its frosted-navy tone with WHITE links (HomeHeader.tsx
// scans [data-dark] against the header's midline). Over a light hero that
// leaves white-on-Cloud-White nav — invisible. Same reason HomeHeroVideo, the
// other light hero variant, has never set it.
//
// data-hero stays: nothing reads it today, but both hero variants carry it and
// it is the obvious hook if a variant ever needs targeting.
//
// ORDER follows the reference: headline → sub → the field → the review line.
// The review line moved BELOW the field. Above the headline it was competing
// for the first thing you read; under the CTA it does what proof should do,
// which is answer "why trust this" at the moment of acting.
//
// STUB, unchanged: the field is inert. /api/resolve wiring is a separate step
// and its backend still only parses ZIPs — see the note in lib/resolveMarket.ts
// callers before wiring.
//
// STUB: the right column is a marked FPO placeholder, not art. Art direction
// is on it in the panel; swap the placeholder for <Image> when the shot
// exists, and drop .dp-hero-fpo's hatch with it.
const FPO = {
  label: "FPO",
  brief: "Hero interior: staged living room, high key, morning light, 24mm",
};

export function HomeHero() {
  return (
    <section data-hero="true" className="dp-hero dp-hero--editorial" id="get-estimate">
      <div className="dp-container dp-hero-grid">
        <div className="dp-hero-copy">
          <h1>Win more listings. Sell more homes.</h1>
          <p className="dp-hero-sub">
            We do the repairs and updates that get homes sold &mdash; your seller pays nothing
            until closing.
          </p>

          {/* The one action in the hero. Deliberately a real field and not a
              pair of buttons: the visitor's market is the thing every next
              step needs, so asking for it here is worth more than a second
              CTA competing with the first. */}
          <div className="dp-hero-form">
            <label className="dp-hero-formlabel" htmlFor="dp-zip">
              Enter your ZIP, market, or address to reach your local manager
            </label>
            <div className="dp-hero-search">
              <input
                id="dp-zip"
                type="text"
                placeholder="ZIP, market, or address"
                autoComplete="off"
              />
              <button type="button">Find my manager</button>
            </div>
          </div>

          {/* Review line. FIVE STARS IN REVIEW-GREEN — the only green on the
              page, and load-bearing rather than decorative: green plus five
              filled stars is the visual grammar of third-party review
              platforms, so the line reads as "someone else vouched for us".
              Navy would read as Curbio talking about itself; amber is reserved
              for CTAs. See --review-green in home.css.

              Stars are aria-hidden and the link carries its own label, so a
              screen reader gets one sentence rather than five repetitions of
              "black star". */}
          <a
            className="dp-hero-eyebrow"
            href="https://www.featuredcustomers.com/vendor/curbio"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Rated 4.8 out of 5 stars from 1,776 Featured Customers (opens in a new tab)"
          >
            <span className="dp-hero-stars" aria-hidden="true">
              &#9733;&#9733;&#9733;&#9733;&#9733;
            </span>
            <span aria-hidden="true">4.8/5 stars from 1,776 Featured Customers</span>
          </a>
        </div>

        {/* Marked placeholder, not art. aria-hidden with an empty accessible
            name: an FPO brief is production chatter, and reading it out is
            worse than silence. Nothing here is announced. */}
        <div className="dp-hero-fpo" aria-hidden="true">
          <div className="dp-hero-fpo-card">
            <span className="dp-hero-fpo-tag">{FPO.label}</span>
            <span className="dp-hero-fpo-brief">{FPO.brief}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
