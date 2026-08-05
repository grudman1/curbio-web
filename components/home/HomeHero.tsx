import { HeroMedia } from "./HeroMedia";

// Split hero — text left (~45%), the kitchen-transformation video right.
// The media column sets the height; nothing overlaps it.
//
// The ZIP/market/address field is the ONE primary CTA in the hero — no
// second "Get a free estimate" button competing with it. "See a deal run
// start to finish" is the only secondary action, an anchor to the deal
// timeline below.
//
// STUB: the field is inert (button type="button", no handler) — wiring to
// /api/resolve and the lead pipeline stays a separate, deliberate step. Flag
// for that later step: lib/resolveMarket.ts's ZIP path currently strips
// input to digits-only (`.replace(/\D/g, "")`) and has no market-name or
// address matching at all — "Atlanta" or a street address resolves to
// nothing today. The field's copy now promises all three; the backend does
// not yet deliver on market name or address, only ZIP and the ?market=
// slug. Whoever wires this needs to close that gap, not just point the
// input at the existing endpoint.
//
// No hero proof line: the proof band immediately below already carries
// rating/review-count/licensing — repeating it one scroll later is the
// redundancy this hero was asked to drop.
export function HomeHero() {
  return (
    <section data-hero="true" className="dp-hero" id="get-estimate">
      <div className="dp-container dp-hero-grid">
        <div>
          <h1>Win the listing. Drop the hammer.</h1>
          <p className="dp-hero-sub">
            Curbio does the renovations and repairs that get homes sold — your seller pays
            nothing until closing.
          </p>
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
          <div className="dp-hero-ctas">
            <a className="dp-cta--outline" style={{ fontSize: 15.5, padding: "13.5px 26px" }} href="#deal">
              See a deal run start to finish
            </a>
          </div>
        </div>
        <HeroMedia />
      </div>
    </section>
  );
}
