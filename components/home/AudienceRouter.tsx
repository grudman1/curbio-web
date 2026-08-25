import Link from "next/link";

// Audience router — agents, brokerages, homeowners. The two broker quotes
// moved here from the standalone quotes block: proof matched to the audience.
//
// The card CTAs were inert spans while their destinations were planned pages;
// the pages exist now, so they are real links. The old per-audience split
// (/how-it-works/agents · /how-it-works/sellers) was placeholder IA — both
// audiences land on the one /how-it-works page; brokerages land on /brokers.

const CARDS = [
  {
    eyebrow: "For agents",
    title: "I'm an agent",
    line: "Walk in with a plan, a date, and a price.",
    quote:
      "“I used to hand sellers a contractor's number and hope. Now I hand them a plan.”",
    attr: "Dana Whitfield · Associate broker, RE/MAX Realty Centre",
    target: "/how-it-works",
  },
  {
    eyebrow: "For brokerages",
    title: "I'm a brokerage or team",
    line: "A program your whole office can sell with.",
    quote:
      "“Curbio in the listing presentation wins us the appointment.”",
    attr: "Marcus Adeyemi · Managing broker, Keller Williams",
    target: "/brokers",
  },
  {
    eyebrow: "For homeowners",
    title: "I'm a homeowner",
    line: "Your agent brings us in; you pay at closing.",
    quote: null,
    attr: null,
    target: "/how-it-works",
  },
];

export function AudienceRouter() {
  return (
    <section className="c-sect" id="audiences">
      <div className="c-container">
        <h2 className="c-h2" style={{ maxWidth: "14em" }}>
          Where do you sit at the table?
        </h2>
        <div className="c-route-grid">
          {CARDS.map((c) => (
            <div key={c.title} className="c-route-card">
              <p className="c-route-eyebrow">{c.eyebrow}</p>
              <h3 className="c-route-title">{c.title}</h3>
              <p className="c-route-line">{c.line}</p>
              {c.quote && (
                <>
                  <blockquote className="c-route-quote">{c.quote}</blockquote>
                  <p className="c-route-attr">{c.attr}</p>
                </>
              )}
              <Link className="c-ulink c-route-cta" href={c.target}>
                {c.title.replace("I'm", "For")} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
