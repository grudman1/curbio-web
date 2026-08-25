// The navy full-bleed stat band — the homepage's NavyProofBand, generalised.
// Serif display figures over sans labels, dividers at 18% white, no amber:
// the band asks for nothing, and amber is the CTA colour.

export function NavyStatBand({
  stats,
  label,
}: {
  stats: { figure: string; label: string }[];
  label: string;
}) {
  return (
    <section className="c-navyproof" data-dark="true" aria-label={label}>
      <div className="c-container">
        <ul className="c-navyproof-grid">
          {stats.map((s) => (
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
