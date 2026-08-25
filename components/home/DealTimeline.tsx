"use client";

import { useState } from "react";
import Image from "next/image";

// "One deal, the way it actually ran" — 6906 Deer Run Lane, Midlothian VA
// (replaced 395 Meeting St, Gavin, Aug 24). A bigger, truer story: $78,754.91
// of work including a full roof, new vinyl siding, and two rebuilt bathrooms,
// contract to accepted offer in 90 days, seller out of pocket $0 the whole way.
//
// Every date and figure below comes from the signed contract
// (Hughes-VA20230411C1) and the project's own message log — not marketing
// copy. The quote is the homeowner's, written the day the offer was accepted.
//
// TWO STUBS pending listing-record data (same convention as [rating]/[count]):
//   [sold price]  the settlement figure — closing was Aug 31, 2023
//   [specs]       bd/ba/sqft/year built for the rail card
// Ship-blocking for the card's bottom line; everything else is sourced.

type Entry = {
  date: string;
  title: string;
  body: string;
  figure?: boolean;
  collapsed?: boolean;
};

const ENTRIES: Entry[] = [
  {
    date: "May 2",
    title: "Contract signed",
    body: "$78,754.91 across six trades. No deposit, no progress payments — due at settlement.",
  },
  {
    date: "May 10",
    title: "Kick-off walkthrough",
    body: "Project manager walks the house with the sellers and agent; finishes picked from install photos in real homes.",
    collapsed: true,
  },
  {
    date: "May 22",
    title: "Crews on site",
    body: "Prep starts inside; shingles come off two days later.",
  },
  {
    date: "May 25",
    title: "The roof was worse than it looked",
    body: "Twenty boards of sheathing replaced under the old shingles — caught and fixed mid-tear-off, no new contract, no delay.",
    collapsed: true,
  },
  {
    date: "May 26",
    title: "All the old siding comes down",
    body: "Rot behind the masonite settled it. New vinyl over fresh underlayment, same crew, same week.",
    figure: true,
  },
  {
    date: "Jun 28",
    title: "Bathrooms rebuilt",
    body: "Both baths gutted to new surrounds, vanities, and fixtures — the biggest interior line on the job.",
    collapsed: true,
  },
  {
    date: "Jul 12",
    title: "Final walkthrough",
    body: "Sellers, agent, and PM walk every room and write the punch list together.",
    collapsed: true,
  },
  {
    date: "Jul 18",
    title: "Punch-out, then photos",
    body: "Finishing touches cleared inside the week so the listing goes live on schedule.",
    collapsed: true,
  },
  {
    date: "Jul 31",
    title: "Offer accepted",
    body: "First week on market. Ninety days after the contract was signed.",
  },
  {
    date: "Aug 31",
    title: "Closed — Curbio paid from proceeds",
    body: "The sellers wrote no checks at any point. The balance settled at the closing table.",
  },
];

export function DealTimeline() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="deal" className="c-sect--deal">
      <div className="c-container">
        <h2 className="c-h2" style={{ marginBottom: 20, maxWidth: "14em" }}>
          One deal, the way it actually ran.
        </h2>
        <p className="c-lede">
          Ninety days, contract to accepted offer — with a new roof, new siding, and two rebuilt
          bathrooms in between. Every project runs on this rail.
        </p>
        <div className="cl-grid">
          <aside className="cl-rail">
            <div className="cl-card">
              <p className="cl-addr">
                6906 Deer Run Lane
                <br />
                Midlothian, VA 23112
              </p>
              {/* STUB: bd/ba/sqft/built pending listing record */}
              <p className="cl-specs">Chesterfield County · sold Aug 2023</p>
              <div className="cl-shot" style={{ aspectRatio: "16/10" }}>
                <Image
                  src="/home/deal/6906-deer-run-after.jpg"
                  alt="6906 Deer Run Lane after Curbio's exterior renovation — new roof, new vinyl siding, painted porch"
                  fill
                  sizes="(max-width: 1024px) 90vw, 30vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <h3 className="cl-railh">The numbers at 6906 Deer Run Lane</h3>
              <div className="cl-math">
                <div>
                  <span>Siding &amp; roof</span>
                  <span>$36,973.26</span>
                </div>
                <div>
                  <span>Bathrooms</span>
                  <span>$21,400.22</span>
                </div>
                <div>
                  <span>Exterior repairs &amp; paint</span>
                  <span>$9,512.18</span>
                </div>
                <div>
                  <span>Interior paint</span>
                  <span>$5,409.54</span>
                </div>
                <div>
                  <span>Carpet</span>
                  <span>$4,008.00</span>
                </div>
                <div>
                  <span>Misc</span>
                  <span>$1,451.71</span>
                </div>
                <div className="cl-sum">
                  <span>Curbio scope</span>
                  <span className="cl-val">$78,754.91</span>
                </div>
                <div className="cl-sum">
                  <span>Seller paid before closing</span>
                  <span className="cl-val">$0.00</span>
                </div>
              </div>
              <figure className="cl-review" style={{ margin: "22px 0 0", padding: "20px 22px" }}>
                <blockquote style={{ fontSize: 17, lineHeight: 1.5 }}>
                  We could not have had such a quick and successful offering without the work and
                  effort provided by the entire Curbio team.
                </blockquote>
                <figcaption>John Hughes — seller, 6906 Deer Run Lane</figcaption>
              </figure>
            </div>
          </aside>
          <div className="cl-entries" data-expanded={expanded}>
            {ENTRIES.map((e) => (
              <article key={e.date + e.title} className="cl-entry" data-collapsed={e.collapsed || undefined}>
                <p className="cl-date">{e.date}</p>
                <div>
                  <h3>{e.title}</h3>
                  <p>{e.body}</p>
                  {e.figure && (
                    <figure className="cl-fig">
                      <div className="cl-ba">
                        <figure>
                          <div className="cl-shot">
                            <Image
                              src="/home/deal/6906-deer-run-before.jpg"
                              alt="6906 Deer Run Lane before — worn siding and a mossy roof"
                              fill
                              sizes="(max-width: 640px) 90vw, 28vw"
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                          <p className="cl-balabel">Before</p>
                        </figure>
                        <figure>
                          <div className="cl-shot">
                            <Image
                              src="/home/deal/6906-deer-run-after.jpg"
                              alt="6906 Deer Run Lane after — new roof, new siding, refreshed porch"
                              fill
                              sizes="(max-width: 640px) 90vw, 28vw"
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                          <p className="cl-balabel">After</p>
                        </figure>
                      </div>
                    </figure>
                  )}
                </div>
              </article>
            ))}
            <button type="button" className="cl-expand" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? "Show the five milestones" : `Every step, dated — show all ${ENTRIES.length}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
