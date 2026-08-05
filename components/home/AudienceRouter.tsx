// Audience router — agents, brokerages, homeowners. The two broker quotes
// moved here from the standalone quotes block: proof matched to the audience.
//
// STUB: card destinations are the planned pages from config/navigation.ts —
// none exist yet, so the CTAs are inert spans like the rest of the page's
// links, each annotated with its eventual target.

const CARDS = [
  {
    eyebrow: "For agents",
    title: "I'm an agent",
    line: "Walk in with a plan, a date, and a price.",
    quote:
      "“I used to hand sellers a contractor's number and hope. Now I hand them a plan.”",
    attr: "Dana Whitfield · Associate broker, RE/MAX Realty Centre",
    target: "/how-it-works/agents",
  },
  {
    eyebrow: "For brokerages",
    title: "I'm a brokerage or team",
    line: "A program your whole office can sell with.",
    quote:
      "“Curbio in the listing presentation wins us the appointment.”",
    attr: "Marcus Adeyemi · Managing broker, Keller Williams",
    target: "/brokerages",
  },
  {
    eyebrow: "For homeowners",
    title: "I'm a homeowner",
    line: "Your agent brings us in; you pay at closing.",
    quote: null,
    attr: null,
    target: "/how-it-works/sellers",
  },
];

export function AudienceRouter() {
  return (
    <section className="dp-sect dp-sect--raised" id="audiences">
      <div className="dp-container">
        <h2 className="dp-h2" style={{ maxWidth: "14em" }}>
          Where do you sit at the table?
        </h2>
        <div className="dp-route-grid">
          {CARDS.map((c) => (
            <div key={c.title} className="dp-route-card">
              <p className="dp-route-eyebrow">{c.eyebrow}</p>
              <h3 className="dp-route-title">{c.title}</h3>
              <p className="dp-route-line">{c.line}</p>
              {c.quote && (
                <>
                  <blockquote className="dp-route-quote">{c.quote}</blockquote>
                  <p className="dp-route-attr">{c.attr}</p>
                </>
              )}
              {/* becomes <Link href={c.target}> when the page exists */}
              <span className="dp-ulink dp-route-cta">{c.title.replace("I'm", "For")} →</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
