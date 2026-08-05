import Image from "next/image";

// "One deal, the way it actually ran" — the 395 Meeting St case study:
// sticky facts card on the left rail, dated timeline on the right.
// All copy and figures are real (signed contract + public listing record),
// carried over verbatim from the approved design file.

type Entry = {
  date: string;
  title: string;
  body: React.ReactNode;
  quote?: string;
  figure?: boolean;
};

const ENTRIES: Entry[] = [
  {
    date: "Jun 3",
    title: "The agent calls",
    body: (
      <>
        Shequira Edmonds calls Curbio about a McDonough listing that needs full interior paint,
        drywall and door repairs, and carpet work. Christine Harvey, Curbio&rsquo;s Atlanta Home
        Services Manager, picks it up and sends financing options the same afternoon.
      </>
    ),
  },
  {
    date: "Jun 4",
    title: "Financing approved",
    body: (
      <>
        The sellers are approved for $33,301 through Notable. Notable pays Curbio as the work is
        invoiced; the sellers settle up when the home sells, or in twelve months — whichever
        comes first. Nothing out of pocket to start.
      </>
    ),
    quote: "“My clients have been approved for $33,301. How do we proceed with next steps?”",
  },
  {
    date: "Jun 7",
    title: "Walkthrough",
    body: (
      <>
        Christine walks the house with Shequira at 1:00 PM on a Sunday. Recommendations: full
        interior paint, carpet on the stairs, hallway and bedrooms, and pressure washing — chosen
        for return, not for volume. A 3D scan goes out so the proposal is priced off
        measurements.
      </>
    ),
  },
  {
    date: "Jun 9",
    title: "Proposal delivered",
    body: (
      <>
        Three line items — interior paint, carpet replacement, exterior — priced from the scan
        and good through June 16. No allowances, no contingency padding.
      </>
    ),
  },
  {
    date: "Jun 10",
    title: "Contract signed",
    body: <>Oneca and Jaquan Smith sign the same day for $19,731.00 and the project opens.</>,
    quote: "“My clients are good to go with everything. All listed items on the proposal.”",
  },
  {
    date: "Jun 15",
    title: "Crews on site",
    body: (
      <>
        Kickoff walkthrough at noon with Christine, the crew lead, and the agent. The house is
        vacant, so there is no working around a family.
      </>
    ),
  },
  {
    date: "Jun 22",
    title: "Paint and exterior done",
    body: (
      <>
        Interior painting and pressure washing complete; carpet goes in the same day. Christine
        sends Shequira progress photos without being asked for them.
      </>
    ),
    figure: true,
  },
  { date: "Jun 25", title: "Mid-project walkthrough", body: <>Walked and signed off.</> },
  {
    date: "Jun 30",
    title: "Work complete",
    body: (
      <>
        Twenty days after signing, fifteen after the crews started — inside the four weeks the
        proposal estimated.
      </>
    ),
  },
  {
    date: "Jul 10",
    title: "Final walkthrough",
    body: <>Punch list cleared. Curbio&rsquo;s balance closes out at $0.00.</>,
  },
  {
    date: "Jul 17",
    title: "Listing goes live",
    body: <>The home hits the market painted, re-carpeted, and photographed.</>,
  },
  {
    date: "Jul 18",
    title: "Two full-price offers",
    body: <>One day on market. Both at asking. The McDonough median sits at 54 days.</>,
  },
  {
    date: "Jul 23",
    title: "Sold — $347,500",
    body: (
      <>
        $100 a square foot, and $37,500 above the McDonough median sale. The $19,731 of work came
        to 5.7% of what the house sold for.
      </>
    ),
  },
];

export function DealTimeline() {
  return (
    <section id="deal" className="dp-sect--deal">
      <div className="dp-container">
        <h2 className="dp-h2" style={{ marginBottom: 20, maxWidth: "14em" }}>
          One deal, the way it actually ran.
        </h2>
        <p className="dp-lede">
          Fifty days at 395 Meeting Street, from the agent&rsquo;s first phone call to two
          full-price offers in a single day on market. Every Curbio project runs on this rail;
          only the address changes.
        </p>
        <div className="dpl-grid">
          <aside className="dpl-rail">
            <div className="dpl-card">
              <p className="dpl-addr">
                395 Meeting St
                <br />
                McDonough, GA 30252
              </p>
              <p className="dpl-specs">5 bd · 3 ba · 3,472 sq ft · built 2018</p>
              <div className="dpl-shot" style={{ aspectRatio: "16/10" }}>
                <Image
                  src="/home/deal/395-meeting-st-after-dusk.jpg"
                  alt="395 Meeting St at dusk after Curbio's refresh"
                  fill
                  sizes="(max-width: 1024px) 90vw, 30vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <h3 className="dpl-railh">The numbers at 395 Meeting St</h3>
              <div className="dpl-math">
                <div>
                  <span>Interior paint</span>
                  <span>$13,950.00</span>
                </div>
                <div>
                  <span>Carpet replacement</span>
                  <span>$4,932.20</span>
                </div>
                <div>
                  <span>Exterior</span>
                  <span>$848.80</span>
                </div>
                <div className="dpl-sum">
                  <span>Curbio scope</span>
                  <span className="dpl-val">$19,731.00</span>
                </div>
                <div className="dpl-sum">
                  <span>Sold, Jul 23 2026</span>
                  <span className="dpl-val">$347,500</span>
                </div>
              </div>
              <p className="dpl-note">
                Scope from the signed contract; sale price and days on market from the public
                listing record. The sellers paid nothing out of pocket — Notable carried the
                balance to closing.
              </p>
            </div>
          </aside>
          <div className="dpl-entries">
            {ENTRIES.map((e) => (
              <article key={e.date + e.title} className="dpl-entry">
                <p className="dpl-date">{e.date}</p>
                <div>
                  <h3>{e.title}</h3>
                  <p>{e.body}</p>
                  {e.quote && <p className="dpl-quote">{e.quote}</p>}
                  {e.figure && (
                    <figure className="dpl-fig">
                      <div className="dpl-ba">
                        <figure>
                          <div className="dpl-shot">
                            <Image
                              src="/home/deal/395-meeting-st-before.jpg"
                              alt="395 Meeting St before the refresh"
                              fill
                              sizes="(max-width: 640px) 90vw, 28vw"
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                          <p className="dpl-balabel">Before</p>
                        </figure>
                        <figure>
                          <div className="dpl-shot">
                            <Image
                              src="/home/deal/395-meeting-st-after.jpg"
                              alt="395 Meeting St after the refresh"
                              fill
                              sizes="(max-width: 640px) 90vw, 28vw"
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                          <p className="dpl-balabel">After</p>
                        </figure>
                      </div>
                      <figcaption>
                        The same elevation. Curbio&rsquo;s exterior scope was mulch, pressure
                        washing the driveway and walks, and repainting the garage-door trim; the
                        rest of the budget went inside.
                      </figcaption>
                    </figure>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
        <figure className="dpl-review">
          <blockquote>
            Curbio is nothing less than amazing. My client&rsquo;s entire project was coordinated
            by Christine, who also recommended project items that would allow my clients to get a
            higher return on investment. The recommendations landed us two full-price offers
            within one day of listing the property.
          </blockquote>
          <figcaption>Shequira Edmonds — listing agent, 395 Meeting St</figcaption>
        </figure>
      </div>
    </section>
  );
}
