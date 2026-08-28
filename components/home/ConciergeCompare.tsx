// ─────────────────────────────────────────────────────────────────────────────
// "Not all concierge programs do the work." — the page's one comparison.
//
// THE ARGUMENT. Agents do not need to be told that listings should be prepped.
// What they weigh is Curbio against how they handle prep TODAY, and "today"
// is one of three things: a financing-only concierge program, a contractor
// directory, or their own pocket vendors. This section names the first two by
// CATEGORY and never by brand — a named competitor turns a positioning
// statement into a claim someone has to defend, and the categories are what
// the reader actually recognises anyway.
//
// STRUCTURE. It is a <ul> of three <li>, not a grid of divs: to a screen
// reader this is a list of three alternatives, and "list of 3 items" is
// exactly the framing a sighted reader gets from the columns. The Curbio
// column is last and elevated (amber rule + raised surface) — last because
// the two it answers have to be in the reader's head first.
//
// The closing line is serif and centred, and it is the only place on the page
// that says what Curbio is NOT. It earns that by sitting under the evidence.
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    title: "Financing-only programs",
    line: "They advance the money, then leave you and your seller to find, vet, schedule, and manage every contractor yourselves.",
    curbio: false,
  },
  {
    title: "Contractor directories",
    line: "They hand your client to a lead-gen network of independent pros. Nobody owns the schedule, the quality, or the outcome.",
    curbio: false,
  },
  {
    title: "Curbio",
    line: "Funding and full execution. One accountable local manager, a disciplined scope, and a list date we commit to.",
    curbio: true,
  },
];

export function ConciergeCompare() {
  return (
    <section className="c-sect c-sect--white" id="why-curbio" aria-labelledby="why-curbio-h">
      <div className="c-container">
        <p className="c-eyebrow">Why Curbio</p>
        <h2 className="c-h2" id="why-curbio-h" style={{ maxWidth: "14em" }}>
          Not all concierge programs do the work.
        </h2>

        <ul className="c-cmp-grid">
          {COLUMNS.map((c) => (
            <li key={c.title} className={`c-cmp-card${c.curbio ? " c-cmp-card--ours" : ""}`}>
              <h3 className="c-cmp-title">{c.title}</h3>
              <p className="c-cmp-line">{c.line}</p>
            </li>
          ))}
        </ul>

        <p className="c-cmp-close">
          Home improvement is not home readiness. We only do listing prep.
        </p>
      </div>
    </section>
  );
}
