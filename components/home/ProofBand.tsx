import { BROKERAGE_LOGOS } from "@/lib/partners";

// Proof band — one compact row: label left, scrolling brokerage logos right.
//
// The stats row ("8,000+ homes prepped · [rating] from [count] agent reviews ·
// 1-year warranty · Licensed and insured") was dropped (Gavin, Aug 6). It took
// this section's two unsourced placeholders with it, and collapsing to a
// single row cut the band from ~190px to ~90px — which is what lets the whole
// strip sit on screen at landing, the Guest House proportion.
//
// Placeholders still live elsewhere on the page: AwardsStrip carries five
// ([Award] ×2, [rating], [count], [press]). Removing them here did not clear
// the page.
//
// If the stats come back with real numbers, they belong on their own row
// again; the marquee is the part that has to stay compact.
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

export function ProofBand() {
  return (
    <section className="dp-proof" aria-label="Brokerages Curbio agents work with">
      <div className="dp-container dp-proof-row">
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
