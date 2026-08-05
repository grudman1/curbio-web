import { BROKERAGE_LOGOS } from "@/lib/partners";

// Proof band — two rows: stats, then the brokerage logo marquee at lower
// contrast, relabeled "Trusted by agents at". Sits directly under the hero so
// its top edge crests into the first viewport.
//
// Deliberately absent (per the revisions): "7 metro markets" (sounds small out
// of context) and "$0 due before closing" (already in the announcement bar
// and the subhead).
//
// [PENDING DATA] rating + review count are marked values awaiting the real
// numbers; "8,000+ homes prepped" is from the revision spec.
//
// Logos: each declared once in CSS custom properties (see .dp-logo) — never
// repeated <img> tags; the duplicate loop track is aria-hidden.

function LogoRow({ hidden }: { hidden?: boolean }) {
  return (
    <>
      {BROKERAGE_LOGOS.map((b) => (
        <span
          key={b.id}
          className="dp-logo"
          role={hidden ? undefined : "img"}
          aria-label={hidden ? undefined : b.name}
          aria-hidden={hidden || undefined}
          style={
            {
              aspectRatio: b.aspectRatio,
              "--logo-mono": `url(${b.logoPath})`,
              "--logo-color": `url(${b.logoPathColor})`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

const STATS: React.ReactNode[] = [
  <>
    <b>8,000+</b> homes prepped
  </>,
  <>
    <b>[rating]</b> from <b>[count]</b> agent reviews
  </>,
  <>
    <b>1-year</b> warranty
  </>,
  <>Licensed and insured</>,
];

export function ProofBand() {
  return (
    <section className="dp-proof" aria-label="Proof">
      <div className="dp-container">
        <p className="dp-proof-stats">
          {STATS.map((s, i) => (
            <span key={i} className="dp-proof-stat">
              {s}
              {i < STATS.length - 1 && (
                <span className="dp-proof-sep" aria-hidden>
                  ·
                </span>
              )}
            </span>
          ))}
        </p>
        <p className="dp-proof-label">Trusted by agents at</p>
        <div className="dp-marquee" data-animated="true">
          <div className="dp-marquee-track">
            <LogoRow />
            <LogoRow hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
