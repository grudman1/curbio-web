// The four proof numbers, as a statement (Gavin, Aug 8).
//
// These lived in a thin white strip under the hero, stacked above the
// brokerage logos, where they read as fine print next to the headline. Moved
// out of the hero area entirely and given a full-bleed navy band of their
// own, directly after the services carousel — the point in the page where
// "here is everything we do" has just landed and "here is why you can trust
// us with it" is the natural next beat.
//
// SCALE, and why: the figure is set at --text-display-h2, the same token as
// the page's section headings. That is deliberate — these numbers are making
// an argument, so they carry the weight of a headline rather than of a
// caption. Serif for the figure (Curbio's display face, matching every h2 on
// the page) and sans for the label beneath it, which is the same
// figure-over-label pairing the deal timeline and move-in stats already use.
// Nothing new is invented: navy surface, inverse text, existing type ramp.
//
// NO AMBER. Amber is the CTA colour and this band asks for nothing — it is
// navy and white, with dividers at 18% white. A single accent was considered
// and dropped: four numbers all shouting is exactly the "if everything is
// amber, nothing is" failure.
//
// Values are final and unchanged from the strip they replaced. "1-year"
// stays hyphenated.

const STATS = [
  { figure: "8,000+", label: "homes prepped" },
  { figure: "$0", label: "until closing" },
  { figure: "1-year", label: "warranty" },
  { figure: "Licensed", label: "& insured" },
];

export function NavyProofBand() {
  return (
    <section className="c-navyproof" data-dark="true" aria-label="Curbio by the numbers">
      <div className="c-container">
        <ul className="c-navyproof-grid">
          {STATS.map((s) => (
            <li key={s.figure + s.label} className="c-navyproof-item">
              <p className="c-navyproof-figure">{s.figure}</p>
              <p className="c-navyproof-label">{s.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
