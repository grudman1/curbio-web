import { BROKERAGE_LOGOS } from "@/lib/partners";

// Brokerage trust strip — an infinite CSS marquee of brokerage logos.
//
// The list itself is NOT here: it lives in lib/partners.ts, which owns
// brokerage data for the whole app (one registry, not two lists to maintain).
// This component only decides how it is painted.
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
// Because a CSS background has no intrinsic size to lay out from, each box
// takes its shape from the registry's `aspectRatio` (intrinsic width over the
// common export height). That reserves the correct width before the image
// loads, so the row cannot reflow as logos arrive.

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
