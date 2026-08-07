// "Results worth funding" — the scrolling services list. Cut in v2, back by
// request (Gavin, Aug 7); recovered from history (4223269^) rather than
// rebuilt, so the markup and the dpr-* styles are the v1 originals.
//
// Card photos are CSS background-image classes (dpr-t0…t6 in home.css),
// declared once each; the track renders TWICE for the seamless loop — the
// keyframe translates -50% (minus half the gap) so copy 2 lands exactly
// where copy 1 started. The second copy is aria-hidden, so a screen reader
// hears the seven categories once, not fourteen.
//
// WHAT CHANGED FROM v1: the four-stat row above the marquee is not restored.
// Its own footnote said the numbers came from a single closed project (395
// Meeting St) and "should be replaced with portfolio-wide numbers before
// this ships" — the same unsourced-stat problem that took the "8,000+ homes
// prepped" bar off the proof band. The stat markup is one `git show
// 4223269^:components/home/HomeResults.tsx` away when real numbers exist.
//
// ⚠️ PHOTOS DO NOT MATCH THEIR LABELS — DO NOT SHIP AS-IS.
// v1's note called these "stand-ins pulled from the project library," which
// undersells it. All seven files are EXTERIOR curb-appeal listing photos:
// baths.jpg is a brick house and lawn, kitchens.jpg is a white ranch,
// interior-paint.jpg is a brick colonial, flooring.jpg is a blue rowhouse.
// Only "Exteriors" is honest by accident. A card reading "Baths" over a
// front yard is wrong information on a page selling those services, not a
// polish issue — which is likely why v2 cut the section rather than fix it.
//
// Nothing on disk can fix this: public/ has no interior category photography
// (the lone real interior is home/how/caminito-herminia-kitchen.jpg). This
// needs seven real category photos from Curbio's library before it ships.
//
// Secondary, once real photos exist: source these at 560x800 or better. The
// current files are 360x480 against a 280x400 card, so they go soft at 2x.

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
      </div>
      <div className="dpr-marquee">
        <div className="dpr-track">
          <CardRow />
          <CardRow hidden />
        </div>
      </div>
    </section>
  );
}
