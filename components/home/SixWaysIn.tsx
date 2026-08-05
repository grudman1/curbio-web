// "Six ways in" — the services index rows.

const WAYS = [
  {
    n: "01",
    title: "Refreshes",
    desc: "Paint, flooring, fixtures, punch-out. The two weeks between dated and move-in ready.",
    time: "1–3 weeks",
  },
  {
    n: "02",
    title: "Remodels",
    desc: "Kitchens and baths taken to the studs — when the comps say it pays, and only then.",
    time: "4–8 weeks",
  },
  {
    n: "03",
    title: "Repairs",
    desc: "Roofs, systems, structure. The findings that spook buyers, closed out with permits.",
    time: "varies",
  },
  {
    n: "04",
    title: "Listing prep",
    desc: "Everything your walkthrough flags, finished before the photographer shows up.",
    time: "days",
  },
  {
    n: "05",
    title: "Inspection repairs",
    desc: "The addendum, handled — licensed work with documentation the co-op agent will accept.",
    time: "pre-settlement",
  },
  {
    n: "06",
    title: "Staging",
    desc: "Styled and photo-ready, coordinated with the refresh so the home lists once.",
    time: "with listing",
  },
];

export function SixWaysIn() {
  return (
    <section id="work" className="dp-sect--sixways">
      <div className="dp-container">
        <h2 className="dp-h2" style={{ marginBottom: 72 }}>
          Six ways in.
        </h2>
        {WAYS.map((w) => (
          <div key={w.n} className="dp-row">
            <span
              style={{
                fontFamily: "var(--font-family-sans)",
                fontWeight: 700,
                fontSize: 13,
                color: "var(--color-text-subtle)",
              }}
            >
              {w.n}
            </span>
            <span
              style={{
                fontFamily: "var(--font-family-serif)",
                fontWeight: 600,
                fontSize: 29,
                lineHeight: 1.15,
              }}
            >
              {w.title}
            </span>
            <span style={{ fontSize: 16, color: "var(--color-text-muted)", maxWidth: "36em" }}>
              {w.desc}
            </span>
            <span
              style={{
                fontFamily: "var(--font-family-sans)",
                fontWeight: 800,
                fontSize: 11.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-text-subtle)",
                textAlign: "right",
              }}
            >
              {w.time}
            </span>
          </div>
        ))}
        <p style={{ marginTop: 44, fontSize: 15.5, color: "var(--color-text-muted)" }}>
          Deeper by room:{" "}
          <span className="dp-ulink" style={{ fontWeight: 600 }}>
            Kitchens
          </span>{" "}
          ·{" "}
          <span className="dp-ulink" style={{ fontWeight: 600 }}>
            Bathrooms
          </span>{" "}
          ·{" "}
          <span className="dp-ulink" style={{ fontWeight: 600 }}>
            Exteriors
          </span>
        </p>
      </div>
    </section>
  );
}
