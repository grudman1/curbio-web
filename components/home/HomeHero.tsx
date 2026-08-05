import Image from "next/image";

// Hero. The photo is the LCP element — next/image with `priority` so it
// preloads; `fill` + object-fit keeps the design file's cover behavior.
//
// STUB: the address field is deliberately inert (button type="button", no
// form, no handler) — exactly as it is in the approved design file. Wiring it
// to /api/resolve and the lead pipeline is a separate, deliberate step; this
// PR must not touch lead handling.
export function HomeHero() {
  return (
    <section data-hero="true" className="dp-hero">
      <Image
        src="/sold/northern-virginia/9420BianJac_GreatFalls.jpg"
        alt="Brick colonial in Great Falls, Virginia, prepped by Curbio"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center 38%" }}
      />
      <div className="dp-hero-scrim" />
      <div className="dp-container dp-hero-inner">
        <h1>Stress less. Sell more.</h1>
        <p className="dp-hero-sub">
          We do the repairs and updates that get homes sold — your seller pays nothing until
          closing.
        </p>
        <div className="dp-hero-form">
          <div className="dp-hero-search">
            <input
              type="text"
              aria-label="Address, ZIP code, or city"
              placeholder="Enter an address, ZIP code, or city"
              autoComplete="off"
            />
            <button type="button">Get a free estimate</button>
          </div>
        </div>
      </div>
    </section>
  );
}
