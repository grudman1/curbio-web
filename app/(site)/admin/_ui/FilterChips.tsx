"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Filter chips with their counts, above a table.
//
// A filter nobody can see is a filter nobody uses. The waitlist stopped being
// a tab and became a filter on Leads — and then became invisible, which is
// strictly worse than the tab it replaced. Counts render on each chip so the
// filter states what it would show BEFORE you click it.
//
// State is a URL param like everything else here, so a filtered view is a
// shareable link and the back button works.

export type FilterOption = {
  key: string;
  label: string;
  /** null renders an em-dash — a count we could not read, never a zero. */
  count: number | null;
};

export function FilterChips({
  param,
  options,
  active,
}: {
  param: string;
  options: FilterOption[];
  active: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (key: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (key === options[0].key) p.delete(param);
    else p.set(param, key);
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div role="group" aria-label="Filter" className="mb-ops-gap flex flex-wrap items-center gap-1.5">
      {options.map((o) => {
        const on = o.key === active;
        return (
          <Link
            key={o.key}
            href={hrefFor(o.key)}
            aria-current={on ? "true" : undefined}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 py-[4px] font-sans text-ops-label no-underline transition-colors duration-base ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              on
                ? "border-content bg-content font-bold text-content-on-accent"
                : "border-app-border font-semibold text-content-muted hover:border-content hover:text-content"
            }`}
          >
            {o.label}
            <span className={`tabular-nums ${on ? "text-content-on-accent/70" : "text-content-subtle"}`}>
              {o.count === null ? "—" : o.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
