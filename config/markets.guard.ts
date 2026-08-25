// ─────────────────────────────────────────────────────────────────────────────
// Offline build gate on config/markets.ts.
//
// This used to reconcile the site list against the campaign catalog. There is
// now ONE list, so there is nothing to reconcile — reconciling six lists still
// leaves six lists. What remains is checking that the single list is
// internally coherent, which is the class of mistake a human adding a row can
// still make.
//
// Deliberately OFFLINE and deterministic. It does not call the operator API,
// and it does not probe live URLs. Two reasons:
//
//   1. At seven markets, a human makes every change. Monitoring for drift that
//      nothing can introduce automatically is monitoring for a problem that
//      does not exist.
//   2. Build-time third-party calls have already broken this project: a hung
//      operator fetch failed every deploy on 2026-07-23 and needed a hard
//      timeout to fix (see lib/operator.ts). Putting seven more on the
//      critical path of every build risks "cannot deploy the lead site".
// ─────────────────────────────────────────────────────────────────────────────

import { MARKETS } from "./markets";

function duplicates<T>(values: T[]): T[] {
  return [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];
}

export function assertMarketListIsCoherent(): void {
  const problems: string[] = [];
  const slugs = MARKETS.map((m) => m.slug);

  for (const d of duplicates(slugs)) problems.push(`duplicate slug "${d}"`);
  for (const d of duplicates(MARKETS.map((m) => m.operatorName)))
    problems.push(`duplicate operatorName "${d}" — two markets cannot share an operator API name`);
  for (const d of duplicates(MARKETS.map((m) => m.crmName)))
    problems.push(`duplicate crmName "${d}" — leads would be attributed to the wrong market`);
  for (const d of duplicates(MARKETS.map((m) => m.canonicalZip)))
    problems.push(`duplicate canonicalZip "${d}" — two markets would share one operator lookup`);

  // A legacy spelling that is ALSO a live slug would make the 301 shadow a real
  // page. That is precisely the /markets/baltimore/ shape of failure.
  const legacy = MARKETS.flatMap((m) => m.legacySlugs);
  for (const d of duplicates(legacy)) problems.push(`legacy slug "${d}" claimed by more than one market`);
  for (const l of legacy) {
    if (slugs.includes(l)) {
      problems.push(`"${l}" is both a live slug and a legacy slug — the 301 would shadow a real page`);
    }
  }

  for (const m of MARKETS) {
    if (!/^[a-z0-9-]+$/.test(m.slug)) problems.push(`slug "${m.slug}" is not URL-safe`);
    // displayName carries the state ("Atlanta, GA"), which is why nothing
    // appends it a second time. A mismatch means one of the two is wrong.
    if (!m.displayName.endsWith(`, ${m.state}`)) {
      problems.push(`displayName "${m.displayName}" does not end with its state ", ${m.state}"`);
    }
    if (!/^\d{5}$/.test(m.canonicalZip)) problems.push(`market "${m.slug}" has a malformed canonicalZip`);

    // `placeholder` and an empty `sold` must agree, in BOTH directions. The
    // flag existed for three months as an unread annotation while the sold
    // strip rendered whatever was in the array — so it is checked here rather
    // than trusted. Without the second rule a market keeps its placeholder
    // badge after real listings land; without the first, an empty market
    // renders an empty strip.
    if (m.sold.length === 0 && !m.placeholder) {
      problems.push(
        `market "${m.slug}" has no sold listings but is not marked placeholder — ` +
          `set placeholder: true, or add listings`
      );
    }
    if (m.placeholder && m.sold.length > 0) {
      problems.push(
        `market "${m.slug}" is marked placeholder but lists ${m.sold.length} sold listing(s) — ` +
          `clear placeholder in the commit that adds real proof`
      );
    }
    // An unverified price is a Zestimate. It may sit in the list (the campaign
    // strip shows it; the homepage ticker filters it out), but a market whose
    // proof is ENTIRELY unverified is not proof, and must say so.
    if (m.sold.length > 0 && m.sold.every((s) => s.unverified) && !m.placeholder) {
      problems.push(
        `market "${m.slug}" has only unverified prices — mark it placeholder or add a verified sale`
      );
    }
  }

  if (problems.length) {
    throw new Error(`config/markets.ts is incoherent:\n  - ${problems.join("\n  - ")}`);
  }
}
