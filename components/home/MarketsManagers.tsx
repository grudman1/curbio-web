import Image from "next/image";
import Link from "next/link";
import { MARKETS, marketPath } from "@/config/markets";

// "Eight markets. A manager in each." — market list plus the Home Services
// Managers, BOTH derived from config/markets.ts.
//
// This file used to carry its own seven-row market array, its own four-person
// HSM array, and a hardcoded "Seven markets." headline — an eighth market list
// in a codebase whose whole market model exists to have exactly one. Adding
// Seattle is what surfaced it: every other market surface picked the row up
// automatically and this one silently did not.
//
// Headshots live under public/hsm/ and are referenced by the market rows.

/** Spelled-out counts, so the headline reads as copy rather than a stat. */
const COUNT_WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six",
  "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
];
const spell = (n: number) => COUNT_WORDS[n] ?? String(n);

/**
 * The market's name without a trailing state it already carries — "Washington,
 * DC" → "Washington", so the state column doesn't print DC twice. Generic, not
 * a per-market case: it fires only where `name` already ends in `, ${state}`.
 */
const withoutState = (name: string, state: string) =>
  name.endsWith(`, ${state}`) ? name.slice(0, -(state.length + 2)) : name;

const MARKET_ROWS = MARKETS.map((m) => ({
  name: withoutState(m.name, m.state),
  state: m.state,
}));

// One card per unique HSM, in first-appearance order, listing the markets they
// cover. Same derivation the marketing hub's outreach page uses.
//
// `slug` is the manager's FIRST market — the destination for the name link.
// Most of these people cover several markets and there is no per-manager page
// to send them to, so the link goes where a reader clicking a name actually
// wants to land: a real market page with that manager on it. First rather
// than "primary" because MARKETS carries no primacy field and inventing one
// to serve a link would be the tail wagging the market list.
const HSMS = (() => {
  const byName = new Map<string, { src: string | null; slug: string; areas: string[] }>();
  for (const m of MARKETS) {
    const existing = byName.get(m.hsm.name);
    if (existing) existing.areas.push(withoutState(m.name, m.state));
    else
      byName.set(m.hsm.name, {
        src: m.hsm.photo,
        slug: m.slug,
        areas: [withoutState(m.name, m.state)],
      });
  }
  return [...byName.entries()].map(([name, { src, slug, areas }]) => ({
    name,
    src,
    slug,
    area: areas.join(" · "),
  }));
})();

export function MarketsManagers() {
  return (
    <section className="c-sect--markets">
      <div className="c-container c-mkt-grid">
        <div>
          <h2 className="c-h2">
            {spell(MARKET_ROWS.length)} markets.
            <br />A manager in each.
          </h2>
          <div>
            {MARKET_ROWS.map((m) => (
              <div key={m.name} className="c-mkt-row">
                <span className="c-mkt-name">{m.name}</span>
                <span className="c-mkt-state">{m.state}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="c-mkt-people">
          <div className="c-mkt-hsms">
            {HSMS.map((h) => (
              <figure key={h.name}>
                {h.src && (
                  <Image
                    src={h.src}
                    alt={h.name}
                    width={96}
                    height={96}
                    style={{ objectFit: "cover", objectPosition: "center top", display: "block" }}
                  />
                )}
                <figcaption>
                  <Link className="c-mkt-hsm-name" href={marketPath(h.slug)}>
                    {h.name}
                  </Link>
                  <span className="c-mkt-hsm-area">{h.area}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="c-mkt-note">
            Your ZIP routes to one of these {spell(HSMS.length).toLowerCase()} people. Not a call center.
          </p>
        </div>
      </div>
    </section>
  );
}
