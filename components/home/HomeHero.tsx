import Image from "next/image";

// Hero — full-bleed Curbio project photography with one primary action.
// The photo is the LCP element, so next/image owns responsive AVIF/WebP output.
//
// The split video hero lives on as the A/B "B" variant in HomeHeroVideo.tsx.
//
// data-dark on the section puts the fixed header into its frosted-navy tone
// (white links) while it floats over the photo — same mechanism the ledger
// and closer sections already use.
//
// 5412 Caminito Herminia, the AFTER kitchen shot from a real Curbio project.
// The neutral filter in site.css lowers exposure without introducing a tint.
//
// STUB: field is inert; /api/resolve wiring is a separate step, and its
// backend still only parses ZIPs — see the note in lib/resolveMarket.ts
// callers before wiring.
const HERO_IMAGE = {
  src: "/home/hero/5412-caminito-herminia-kitchen-after.jpg",
  alt: "Renovated kitchen at 5412 Caminito Herminia after Curbio completed the work",
};

export function HomeHero() {
  return (
    <section data-hero="true" data-dark="true" className="c-hero" id="get-estimate">
      <Image
        src={HERO_IMAGE.src}
        alt={HERO_IMAGE.alt}
        fill
        priority
        sizes="100vw"
        className="c-hero-image"
      />
      <div className="c-container c-hero-inner">
        {/* Review line — eyebrow weight on purpose: it must not compete with
            the headline, so it is 14px/600 next to a ~76px serif, and it is a
            plain link, not a badge (no pill, no background).

            FIVE STARS, IN REVIEW-GREEN. The green is the only green on the
            page and it is load-bearing, not decoration: green + five filled
            stars is the visual grammar of third-party review platforms, so
            the line reads as "someone else vouched for us" at a glance.
            Navy would read as Curbio talking about itself, and amber is
            reserved for CTAs. See --review-green in site.css.

            No crowding risk against the "Pay at closing" utility strip: that
            strip is pinned to the TOP of the page inside the header, and hero
            content is BOTTOM-aligned (.c-hero align-items:flex-end, 140px
            bottom padding) — they are at opposite ends of the viewport.

            The stars are aria-hidden and the link carries its own label, so a
            screen reader gets one clean sentence instead of five repetitions
            of "black star". */}
        <a
          className="c-hero-eyebrow"
          href="https://www.featuredcustomers.com/vendor/curbio"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Rated 4.8 out of 5 stars from 1,776 Featured Customers (opens in a new tab)"
        >
          <span className="c-hero-stars" aria-hidden="true">
            &#9733;&#9733;&#9733;&#9733;&#9733;
          </span>
          <span aria-hidden="true">4.8/5 stars from 1,776 Featured Customers</span>
        </a>
        <h1>
          Stop playing general contractor. Start <em>scaling</em> your listings.
        </h1>
        <p className="c-hero-sub">
          We are the pay-at-closing prep team for top agents and teams. We manage the fast
          cosmetic updates, staging, and professional photography to get your listings
          market-ready on time—with $0 due upfront from your sellers.
        </p>
        <div className="c-hero-form">
          <label className="c-hero-formlabel" htmlFor="c-zip">
            Enter your ZIP, market, or address to reach your local manager
          </label>
          <div className="c-hero-search">
            <input id="c-zip" type="text" placeholder="ZIP, market, or address" autoComplete="off" />
            <button type="button">Get free estimate</button>
          </div>
        </div>
      </div>
    </section>
  );
}
