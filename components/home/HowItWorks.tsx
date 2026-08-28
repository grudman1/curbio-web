import Image from "next/image";

// The three jobs — one section headline over three steps.
//
// ── Why the headline stopped rotating ───────────────────────────────────────
// This slot used to carry a CSS-only vertical rotator ("Curbio helps you
// win the listing / prep the house / list on time / …"), modeled on
// Opendoor's hero. It is gone as of the listing-operations rebuild, and the
// reason is positioning, not taste: a rotator spends the reader's attention
// on SIX claims of equal weight, and this page now has exactly one argument
// to make in this slot — that the pitch is pay-at-close concierge, and that
// it wins listings. The three steps below carry the rest.
//
// The machinery it needed is retired with it: @keyframes c-rot-cycle stepped
// by 1/(phrases+1) and had to be rewritten by hand every time a phrase was
// added, and the sr-only twin existed only so a screen reader heard one
// sentence instead of six fragments. A plain <h2> needs neither. The .c-rot-*
// CSS stays in site.css unused — it is the A/B arm if anyone wants the
// rotator measured rather than argued about.
//
// STEP COPY is deliberately about the DIVISION OF LABOUR, not about why
// prepping a listing is a good idea. Agents already know the second thing.

const STEPS = [
  {
    num: "01",
    title: "You win the listing",
    line: "Walk into the presentation with a plan, a price, a date, and pay-at-close. Discount brokers can't match it.",
    src: "/home/how/01-win-the-listing.jpg",
    alt: "An agent showing sellers a Curbio plan on a tablet in their kitchen",
  },
  {
    num: "02",
    title: "We run the project",
    line: "One named local manager owns trades, schedule, and quality. You never chase a painter again.",
    // Frame at 0:25 of the Aaron Glines PM Spotlight cut (1080p, 19 Mbps),
    // re-extracted Aug 7 at 4:3 with a light unsharp — 1.82x sharper measured
    // through the real delivery pipeline. Do NOT swap this for a "sharper"
    // frame without watching the clip: 25.0s is the best usable frame of this
    // shot (there is a cut at ~24.8s, and this shot's sharpest frames have an
    // out-of-focus foreground mass covering half the frame).
    src: "/home/how/02-we-do-the-work.jpg",
    alt: "Curbio crews replacing a window on a home exterior",
  },
  {
    num: "03",
    title: "Seller pays at close",
    line: "Zero upfront, no liens, no title clouds. Your commission is never touched.",
    src: "/home/how/03-pay-at-close.jpg",
    alt: "Sellers holding a SOLD sign with their agent in the kitchen",
  },
];

export function HowItWorks() {
  return (
    <section className="c-sect c-sect--tight-top" id="how-it-works">
      <div className="c-container">
        <h2 className="c-h2" style={{ maxWidth: "16em" }}>
          Pitch pay-at-close concierge to win the listing.
        </h2>

        <div className="c-how-grid">
          {STEPS.map((s) => (
            <div key={s.num} className="c-how-step">
              <div className="c-how-img">
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  sizes="(max-width: 640px) 90vw, 30vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <p className="c-how-num">{s.num}</p>
              <h3 className="c-how-title">{s.title}</h3>
              <p className="c-how-line">{s.line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
