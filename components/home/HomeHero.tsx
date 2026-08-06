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
// IMAGE is a one-line swap ↓. Source was a 6.1MB PNG mislabeled .jpg;
// re-encoded to a real JPEG at 2560px (379KB), which next/image then serves
// as AVIF/WebP at per-viewport widths.
//
// The other candidate (gray-panelled living room) was rejected on
// resolution: 1280×720 is too small for a full-bleed hero and goes soft on
// retina. It's fine for a card or an inline figure if it's wanted elsewhere.
//
// TWO FLAGS on this photo, both for Gavin, neither blocking:
//   1. Provenance — this is not Curbio project photography (it reads as
//      stock/architectural, desert Southwest, Camelback Mountain in frame).
//      Every other photo on this page is Curbio's own portfolio. Confirm
//      the license before this ships publicly.
//   2. It has the same tension the v2 brief raised against the v1 hero:
//      "the house in it needs no work, so the image argues against the
//      product." This room is immaculate. Kept because it was explicitly
//      chosen — noted because that critique still applies.
//
// STUB: field is inert; /api/resolve wiring is a separate step, and its
// backend still only parses ZIPs — see the note in lib/resolveMarket.ts
// callers before wiring.
const HERO_IMAGE = {
  src: "/home/hero/living-room-stone-fireplace.jpg",
  alt: "Sunlit living room with a floor-to-ceiling stone fireplace and mountain view",
  objectPosition: "center 55%",
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
        <h1>Stress less. Sell more.</h1>
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
