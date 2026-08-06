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
// IMAGE is a one-line swap ↓. Currently the v1 brick colonial as a stand-in:
// the two replacement candidates Gavin picked (stone-fireplace living room,
// gray-paneled living room) were pasted as chat images — no files on disk
// yet. Drop them in ~/Downloads and this constant is the only thing that
// changes.
//
// STUB: field is inert; /api/resolve wiring is a separate step, and its
// backend still only parses ZIPs — see the note in lib/resolveMarket.ts
// callers before wiring.
const HERO_IMAGE = {
  src: "/sold/northern-virginia/9420BianJac_GreatFalls.jpg",
  alt: "Brick colonial in Great Falls, Virginia, prepped by Curbio",
  objectPosition: "center 38%",
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
