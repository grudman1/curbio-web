"use client";

import { useState } from "react";
import Link from "next/link";
import { SCOPE_OPTIONS, RANGES_ARE_SOURCED, type ScopeOption } from "@/config/scopeRanges";

// "Ballpark it" — pick the work, see a typical range and timeline.
//
// ⚠️ The ranges are PLACEHOLDERS. config/scopeRanges.ts explains why that is a
// sharper problem here than in ordinary copy: this outputs a dollar figure an
// agent may repeat to a seller. Until RANGES_ARE_SOURCED flips, the card says
// so in the interface rather than only in a code comment — an operator reading
// the page should be able to tell the numbers are illustrative without opening
// the repo.
//
// Chips are real toggle buttons with aria-pressed (the mockup's were too, and
// that part was right). Names come from config/services.ts via SCOPE_OPTIONS,
// so the picker and the /services index can never disagree about what Curbio
// does.

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export function ScopePicker() {
  const [picked, setPicked] = useState<ScopeOption[]>([]);

  const toggle = (option: ScopeOption) => {
    setPicked((current) =>
      current.some((p) => p.slug === option.slug)
        ? current.filter((p) => p.slug !== option.slug)
        : // Keep config order rather than click order, so the summary reads
          // the same way twice.
          SCOPE_OPTIONS.filter((o) => o.slug === option.slug || current.some((p) => p.slug === o.slug))
    );
  };

  const lo = picked.reduce((sum, p) => sum + p.lo, 0);
  const hi = picked.reduce((sum, p) => sum + p.hi, 0);
  // Trades overlap: the longest line sets the floor, and each additional line
  // past the first two adds roughly a week of sequencing.
  const weeks = picked.length
    ? Math.max(...picked.map((p) => p.weeksOnSite)) + Math.max(0, picked.length - 2)
    : 0;

  return (
    <div className="c-scope-grid">
      <div className="c-chips">
        {SCOPE_OPTIONS.map((o) => {
          const on = picked.some((p) => p.slug === o.slug);
          return (
            <button
              key={o.slug}
              type="button"
              className="c-chip"
              aria-pressed={on}
              onClick={() => toggle(o)}
            >
              <span className="c-chip-mark" aria-hidden="true" />
              {o.service.name}
            </button>
          );
        })}
      </div>

      <div className="c-scope-card">
        {picked.length === 0 ? (
          <p className="c-scope-empty">Nothing selected yet. Pick the work this home needs.</p>
        ) : (
          <ul className="c-scope-rows">
            {picked.map((p) => (
              <li key={p.slug} className="c-scope-row">
                <span>{p.service.name}</span>
                <span>
                  {money(p.lo)} – {money(p.hi)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="c-scope-total">
          <span className="c-scope-total-label">Typical range</span>
          <span className="c-scope-total-value" aria-live="polite">
            {picked.length ? `${money(lo)} – ${money(hi)}` : "—"}
          </span>
        </div>

        <p className="c-scope-meta">
          <span>{weeks ? `About ${weeks}–${weeks + 2} weeks on site` : "Timeline —"}</span>
          <span>$0 due until closing</span>
        </p>

        <Link className="c-cta c-scope-cta" href="/contact">
          Get the real number
        </Link>

        <p className="c-scope-fine">
          {RANGES_ARE_SOURCED ? (
            <>
              Ranges are typical for recent projects and are not a quote. Your fixed price comes
              from the walkthrough, and it is the price you pay.
            </>
          ) : (
            <>
              {/* NEEDS FACT: replace config/scopeRanges.ts with real p25/p75 scope
                  costs, then flip RANGES_ARE_SOURCED. */}
              <b>Illustrative only.</b> These ranges are placeholders pending real project data —
              they are not a quote and should not be given to a seller. Your fixed price comes from
              the walkthrough.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
