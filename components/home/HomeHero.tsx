import Image from "next/image";

// Hero — CONTROL variant: the v1 full-bleed photo hero, restored (Gavin,
// Aug 6). One primary action: the field. No second button, no outline CTA
// row, no proof line. The photo is the LCP element — next/image `priority`.
//
// The split video hero lives on as the A/B "B" variant in HomeHeroVideo.tsx.
//
// data-dark on the section puts the fixed header into its frosted-navy tone
// (white links) while it floats over the photo — same mechanism the ledger
// and closer sections already use.
//
// IMAGE is a one-line swap ↓. 305 Johnsberg Ln, the AFTER shot of a real
// Curbio project — 4000×2667 source, re-encoded to 2560px / 869KB, which
// next/image then serves as AVIF/WebP at per-viewport widths.
//
// This one is Curbio's own project photography, so the provenance/licensing
// question that hung over the previous (stock interior) hero is closed.
//
// Rejected candidates, for the record: stock stone-fireplace living room
// (licensing unknown, not Curbio work); gray-panelled living room (1280×720,
// too small for full-bleed — goes soft on retina, but fine for a card).
//
// ONE STANDING NOTE, not blocking: the v2 brief's objection to a full-bleed
// exterior was "the house in it needs no work, so the image argues against
// the product." That still applies to any after-only shot. The unlock, if
// it's ever wanted, is the matching BEFORE frame — pairing them turns the
// hero from a pretty house into the actual pitch. No before shot for this
// address exists on disk today.
//
// STUB: field is inert; /api/resolve wiring is a separate step, and its
// backend still only parses ZIPs — see the note in lib/resolveMarket.ts
// callers before wiring.
const HERO_IMAGE = {
  src: "/home/hero/305-johnsberg-exterior.jpg",
  alt: "305 Johnsberg Lane — brick colonial after Curbio's pre-listing exterior refresh",
  objectPosition: "center 62%",
};

export function HomeHero() {
  return (
    <section data-hero="true" data-dark="true" className="dp-hero" id="get-estimate">
      <Image
        src={HERO_IMAGE.src}
        alt={HERO_IMAGE.alt}
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: HERO_IMAGE.objectPosition }}
      />
      <div className="dp-hero-scrim" />
      <div className="dp-container dp-hero-inner">
        {/* Review line — eyebrow weight on purpose: it must not compete with
            the headline, so it is 14px/600 next to a ~76px serif, and it is a
            plain link, not a badge (no pill, no background).

            FIVE STARS, IN REVIEW-GREEN. The green is the only green on the
            page and it is load-bearing, not decoration: green + five filled
            stars is the visual grammar of third-party review platforms, so
            the line reads as "someone else vouched for us" at a glance.
            Navy would read as Curbio talking about itself, and amber is
            reserved for CTAs. See --review-green in home.css.

            No crowding risk against the "Pay at closing" utility strip: that
            strip is pinned to the TOP of the page inside the header, and hero
            content is BOTTOM-aligned (.dp-hero align-items:flex-end, 140px
            bottom padding) — they are at opposite ends of the viewport.

            The stars are aria-hidden and the link carries its own label, so a
            screen reader gets one clean sentence instead of five repetitions
            of "black star". */}
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
        <h1>Win more listings. Sell more homes.</h1>
        <p className="dp-hero-sub">
          We do the repairs and updates that get homes sold — your seller pays nothing until
          closing.
        </p>
        <div className="dp-hero-form">
          <label className="dp-hero-formlabel" htmlFor="dp-zip">
            Enter your ZIP, market, or address to reach your local manager
          </label>
          <div className="dp-hero-search">
            <input id="dp-zip" type="text" placeholder="ZIP, market, or address" autoComplete="off" />
            <button type="button">Find my manager</button>
          </div>
        </div>
      </div>
    </section>
  );
}
