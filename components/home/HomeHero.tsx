import { HeroMedia } from "./HeroMedia";

// Split hero — text left (~45%), the kitchen-transformation video right.
// The media column sets the height; nothing overlaps it.
//
// STUB: the ZIP field is inert (button type="button", no handler), exactly as
// in v1 — wiring to /api/resolve and the lead pipeline stays a separate,
// deliberate step.
//
// [PENDING DATA] The proof line's rating and review count are marked values
// awaiting the real numbers — same convention as the revision spec's
// "[rating] from [count]".
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
          <div className="dp-hero-ctas">
            <a className="dp-cta" style={{ fontSize: 16, padding: "15px 30px" }} href="#dp-zip">
              Get a free estimate
            </a>
            <a className="dp-cta--outline" style={{ fontSize: 15.5, padding: "13.5px 26px" }} href="#deal">
              See a deal run start to finish
            </a>
          </div>
          <p className="dp-hero-proofline">
            <b>★ [4.x]</b> from [count] agent reviews · Licensed and insured
          </p>
          <div className="dp-hero-form">
            <label className="dp-hero-formlabel" htmlFor="dp-zip">
              Enter a ZIP to reach your local manager.
            </label>
            <div className="dp-hero-search">
              <input
                id="dp-zip"
                type="text"
                inputMode="numeric"
                aria-label="ZIP code"
                placeholder="ZIP code"
                autoComplete="off"
                maxLength={5}
              />
              <button type="button">Get a free estimate</button>
            </div>
          </div>
        </div>
        <HeroMedia />
      </div>
    </section>
  );
}
