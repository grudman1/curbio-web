// "Results worth funding" — four stats plus a marquee of project-category
// cards. Card photos are CSS background-image classes (dpr-t0…t6 in
// home.css), declared once each; the track renders twice for the seamless
// loop, second copy aria-hidden.

const STATS = [
  { label: "Upfront cost", num: "$0" },
  { label: "Days to first offer", num: "1" },
  { label: "Above the area median sale", num: "$37.5K" },
  { label: "Scope as share of sale", num: "5.7%" },
];

const CARDS = [
  "Interior paint",
  "Flooring",
  "Kitchens",
  "Baths",
  "Exteriors",
  "Pressure washing",
  "Landscaping",
];

function CardRow({ hidden }: { hidden?: boolean }) {
  return (
    <>
      {CARDS.map((label, i) => (
        <div
          key={label}
          className={`dpr-card dpr-t${i}`}
          role={hidden ? undefined : "img"}
          aria-label={hidden ? undefined : label}
          aria-hidden={hidden || undefined}
        >
          <p className="dpr-pill">{label}</p>
        </div>
      ))}
    </>
  );
}

export function HomeResults() {
  return (
    <section id="results" className="dp-sect dp-sect--raised">
      <div className="dp-container">
        <p className="dp-eyebrow">Results worth funding</p>
        <h2 className="dp-h2" style={{ maxWidth: "15em" }}>
          Put the money into the work that moves the price.
        </h2>
        <div className="dpr-stats">
          {STATS.map((s) => (
            <div key={s.label} className="dpr-stat">
              <p className="dpr-statlabel">{s.label}</p>
              <p className="dpr-statnum">{s.num}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="dpr-marquee">
        <div className="dpr-track">
          <CardRow />
          <CardRow hidden />
        </div>
      </div>
      <div className="dp-container">
        <p className="dpr-foot">
          Upfront cost reflects Curbio&rsquo;s pay-at-close model. The other three figures come
          from a single closed project (395 Meeting St, sold 7/23/2026) and should be replaced
          with portfolio-wide numbers before this ships. Card photos are stand-ins pulled from
          the project library — the categories need their own photography.
        </p>
      </div>
    </section>
  );
}
