"use client";

import { useState } from "react";
import Image from "next/image";

// "One deal, the way it actually ran" — 395 Meeting St, compressed: six
// milestones visible, the other seven behind an expand, in true order. The
// numbers card keeps the Shequira Edmonds quote attached.
// All figures are real (signed contract + public listing record).

type Entry = {
  date: string;
  title: string;
  body: string;
  quote?: string;
  figure?: boolean;
  collapsed?: boolean;
};

const ENTRIES: Entry[] = [
  {
    date: "Jun 3",
    title: "The agent calls",
    body: "The ask: paint, drywall repairs, carpet.",
  },
  {
    date: "Jun 4",
    title: "Financing approved",
    body: "$33,301 through Notable. Nothing out of pocket.",
  },
  {
    date: "Jun 7",
    title: "Walkthrough",
    body: "Christine walks the house on a Sunday; a 3D scan prices the proposal off measurements.",
    collapsed: true,
  },
  {
    date: "Jun 9",
    title: "Proposal delivered",
    body: "Three line items, priced from the scan. No allowances, no contingency padding.",
    collapsed: true,
  },
  {
    date: "Jun 10",
    title: "Contract signed",
    body: "Signed the same day: $19,731.00.",
  },
  {
    date: "Jun 15",
    title: "Crews on site",
    body: "Kickoff at noon with Christine, the crew lead, and the agent.",
    collapsed: true,
  },
  {
    date: "Jun 22",
    title: "Paint and exterior done",
    body: "Paint done; carpet goes in the same day.",
    figure: true,
  },
  { date: "Jun 25", title: "Mid-project walkthrough", body: "Walked and signed off.", collapsed: true },
  {
    date: "Jun 30",
    title: "Work complete",
    body: "Twenty days after signing — inside the four-week estimate.",
    collapsed: true,
  },
  { date: "Jul 10", title: "Final walkthrough", body: "Punch list cleared. Balance: $0.00.", collapsed: true },
  { date: "Jul 17", title: "Listing goes live", body: "Painted, re-carpeted, photographed.", collapsed: true },
  {
    date: "Jul 18",
    title: "Two full-price offers",
    body: "One day on market, both at asking.",
  },
  {
    date: "Jul 23",
    title: "Sold — $347,500",
    body: "$37,500 over the area median — the work was 5.7% of sale.",
  },
];

export function DealTimeline() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="deal" className="dp-sect--deal">
      <div className="dp-container">
        <h2 className="dp-h2" style={{ marginBottom: 20, maxWidth: "14em" }}>
          One deal, the way it actually ran.
        </h2>
        <p className="dp-lede">
          Fifty days, first call to two full-price offers. Every project runs on this rail.
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
              <figure className="dpl-review" style={{ margin: "22px 0 0", padding: "20px 22px" }}>
                <blockquote style={{ fontSize: 17, lineHeight: 1.5 }}>
                  Curbio is nothing less than amazing — two full-price offers within one day of listing.
                </blockquote>
                <figcaption>Shequira Edmonds — listing agent, 395 Meeting St</figcaption>
              </figure>
            </div>
          </aside>
          <div className="dpl-entries" data-expanded={expanded}>
            {ENTRIES.map((e) => (
              <article key={e.date + e.title} className="dpl-entry" data-collapsed={e.collapsed || undefined}>
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
                    </figure>
                  )}
                </div>
              </article>
            ))}
            <button type="button" className="dpl-expand" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? "Show the six milestones" : `Every step, dated — show all ${ENTRIES.length}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
