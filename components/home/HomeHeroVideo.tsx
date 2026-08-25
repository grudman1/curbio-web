import { HeroMedia } from "./HeroMedia";

// Hero — "B" VARIANT: the split layout with the kitchen-transformation
// video (text left ~45%, media right ~55%). Not rendered by the page today;
// the control is the full-bleed photo hero in HomeHero.tsx (Gavin, Aug 6).
// Kept building (imported nowhere, but type-checked and styled) so the A/B
// experiment can mount it without archaeology.
//
// Same corrected field copy as the control — the field's promise must not
// vary between variants, only the presentation around it.
export function HomeHeroVideo() {
  return (
    <section data-hero="true" className="c-hero c-hero--split" id="get-estimate">
      <div className="c-container c-hero-grid">
        <div>
          <h1>Win the listing. Drop the hammer.</h1>
          <p className="c-hero-sub">
            Curbio does the renovations and repairs that get homes sold — your seller pays
            nothing until closing.
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
          <div className="c-hero-ctas">
            <a className="c-cta--outline" style={{ fontSize: 15.5, padding: "13.5px 26px" }} href="#deal">
              See a deal run start to finish
            </a>
          </div>
        </div>
        <HeroMedia />
      </div>
    </section>
  );
}
