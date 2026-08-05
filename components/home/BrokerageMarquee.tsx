// Brokerage trust strip — an infinite CSS marquee of brokerage logos.
//
// Each logo is declared ONCE, in CSS (a mono layer and a hover-color layer as
// custom properties on the span; home.css paints them as ::before/::after).
// Never a row of repeated inline <img> tags: repeating inline images to fake
// a loop is what silently failed in this design's predecessor when the page
// hit the browser's inline-asset weight ceiling. The track itself renders
// twice because a translateX(-50%) marquee needs two copies to loop
// seamlessly — the second copy is aria-hidden so nothing is read twice, and
// both copies reference the same 19 files, fetched once.
//
// All source PNGs are 80px tall; the design file renders them 28px tall at
// natural width, so each span's aspect-ratio is (source width)/80.

const BROKERAGES: { slug: string; name: string; width: number }[] = [
  { slug: "la-rosa", name: "La Rosa Realty", width: 260 },
  { slug: "coldwell-banker", name: "Coldwell Banker", width: 112 },
  { slug: "lpt-realty", name: "LPT Realty", width: 336 },
  { slug: "keller-williams", name: "Keller Williams", width: 175 },
  { slug: "perry-miller-streiff", name: "Perry-Miller Streiff", width: 270 },
  { slug: "better-homes-gardens", name: "Better Homes & Gardens Real Estate", width: 149 },
  { slug: "weichert", name: "Weichert Realtors", width: 306 },
  { slug: "realty-executives", name: "Realty Executives", width: 168 },
  { slug: "re-max", name: "RE/MAX", width: 438 },
  { slug: "simplihom", name: "simpliHOM", width: 383 },
  { slug: "engel-volkers", name: "Engel & Völkers", width: 747 },
  { slug: "adams-cameron", name: "Adams Cameron & Co. Realtors", width: 104 },
  { slug: "long-foster", name: "Long & Foster Real Estate", width: 136 },
  { slug: "realty-one-group", name: "Realty ONE Group", width: 308 },
  { slug: "atlas-real-estate", name: "Atlas Real Estate", width: 269 },
  { slug: "ansley", name: "Ansley Real Estate", width: 277 },
  { slug: "samson-properties", name: "Samson Properties", width: 373 },
  { slug: "empowerhome", name: "EmpowerHome Team", width: 156 },
  { slug: "homesmart", name: "HomeSmart", width: 167 },
];

function LogoRow({ hidden }: { hidden?: boolean }) {
  return (
    <>
      {BROKERAGES.map((b) => (
        <span
          key={b.slug}
          className="dp-logo"
          role="img"
          aria-label={hidden ? undefined : b.name}
          aria-hidden={hidden || undefined}
          style={
            {
              aspectRatio: `${b.width} / 80`,
              "--logo-mono": `url(/partners/brokerages/${b.slug}.png)`,
              "--logo-color": `url(/partners/brokerages/${b.slug}-color.png)`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

export function BrokerageMarquee() {
  return (
    <section className="dp-sect--trust">
      <div className="dp-container">
        <div className="dp-trust">
          <p className="dp-trust-label">Curbio agents work with brokerages nationwide.</p>
          <div className="dp-marquee" data-animated="true">
            <div className="dp-marquee-track">
              <LogoRow />
              <LogoRow hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
