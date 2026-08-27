"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Sub-navigation WITHIN a screen.
//
// The working views of a channel are not peers of the channel. Outreach is how
// Partnerships gets done; Partners is its call plan; Links, Forms and Contacts
// are instruments of Attribution. Promoting them to top-level nav rows made
// the sidebar 22 items long and implied seven things to check where there are
// three.
//
// Real routes, not client state: each tab has its own URL, so it is
// bookmarkable and the back button behaves. The header's timeframe and
// attribution params ride along like every other link in this app.

export type SubTab = { href: string; label: string };

export function SubTabs({ tabs }: { tabs: SubTab[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const withQuery = (href: string) => (qs ? `${href}?${qs}` : href);

  // Longest match wins so a nested tab doesn't also light up its parent.
  const activeHref = tabs
    .filter((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Section" className="-mt-1 mb-ops-gap flex gap-1 border-b border-edge">
      {tabs.map((t) => {
        const active = t.href === activeHref;
        return (
          <Link
            key={t.href}
            href={withQuery(t.href)}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 pb-2 pt-1 font-sans text-ops-body no-underline transition-colors duration-base ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active
                ? "border-content font-bold text-content"
                : "border-transparent font-semibold text-content-muted hover:text-content"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
