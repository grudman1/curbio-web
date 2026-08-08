import { ServicesMarquee } from "./ServicesMarquee";

// "Results worth funding" — the scrolling services list. Cut in v2, restored
// in #37, and given its real ten services + photography on Aug 7 (Gavin).
//
// Card photos are CSS background-image classes (dpr-t0…t9 in home.css),
// declared once each; the track renders TWICE for the seamless loop — the
// keyframe translates -50% (minus half the gap) so copy 2 lands exactly
// where copy 1 started. The second copy is aria-hidden, so a screen reader
// hears the ten services once, not twenty.
//
// LABEL ONLY on the card — one line of text over the photo. The service
// descriptions Gavin wrote were photo-selection direction, NOT card copy,
// and deliberately don't appear here.
//
// The photos are real category photography now, one per service, replacing
// the seven v1 stand-ins that were all exterior curb shots regardless of
// label (a card reading "Baths" over a front lawn). Sources are Gavin's,
// cropped to 560x800 — 2x the 280x400 card — so they hold on retina.
//
// STUB: "See all services" points at /services, which is `planned` in
// config/pageRegistry.ts (linked in the nav, no route behind it yet). Same
// status as the audience-router card targets.
//
// WHAT'S STILL NOT RESTORED: the four-stat row that sat above the marquee in
// v1. Its own footnote said the numbers came from a single closed project
// (395 Meeting St) and "should be replaced with portfolio-wide numbers
// before this ships." Markup is one `git show
// 4223269^:components/home/HomeResults.tsx` away when real numbers exist.

const CARDS = [
  "Interior & exterior painting",
  "Flooring",
  "Kitchen updates",
  "Bathroom updates",
  "Lighting & electrical",
  "Curb appeal & landscaping",
  "Staging",
  "Roofing & exterior repair",
  "HVAC & plumbing",
  "Deep cleaning & haul-away",
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
      <ServicesMarquee>
        <CardRow />
        <CardRow hidden />
      </ServicesMarquee>
      <div className="dp-container">
        <a className="dpr-cta" href="/services">
          See all services <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </section>
  );
}
