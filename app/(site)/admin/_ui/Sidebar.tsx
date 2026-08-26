"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV, navHref, navItemFor } from "@/config/adminNav";
import { NavIcon } from "./NavIcon";

// The one sidebar. Nav never changes shape — that is the point of collapsing
// two shells into one.
//
// ACTIVE STATE IS NAVY, NOT AMBER. Inside /admin amber means "warning" and
// nothing else (DECISIONS.md → "Amber is signal-only inside /admin"). A colour
// that means both "behind" and "you are here" means neither.

export function Sidebar({ leadCount }: { leadCount?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Navigating keeps the header's timeframe and attribution state — the whole
  // reason that state lives in the URL.
  const qs = searchParams.toString();
  const withQuery = (href: string) => (qs ? `${href}?${qs}` : href);
  const active = navItemFor(pathname);

  return (
    <>
      {/* Mobile: the drawer toggle, labelled with where you are. */}
      <div className="sticky top-ops-header z-30 border-b border-edge bg-surface-raised md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-nav"
          onClick={() => setOpen(!open)}
          className="flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-4 py-2.5 font-sans text-ops-body font-bold text-content"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M1.5 3h11M1.5 7h11M1.5 11h11" />
          </svg>
          {active?.label ?? "Admin"}
        </button>
      </div>

      <nav
        id="admin-nav"
        aria-label="Admin sections"
        className={`${
          open ? "block" : "hidden"
        } w-full flex-none border-b border-edge bg-surface-raised px-3 pb-4 md:sticky md:top-ops-header md:block md:max-h-[calc(100vh-var(--ops-header-h))] md:w-ops-sidebar md:self-start md:overflow-y-auto md:border-b-0 md:border-r md:bg-transparent md:px-3 md:pb-12 md:pt-4`}
      >
        {ADMIN_NAV.map((group) => (
          <div key={group.title} className="mt-4 first:mt-0">
            {/* Group labels are the MAP, not a caption. At text-content-subtle
                they read as grey noise and the structure of the nav
                disappears — so they take the full content colour at bold,
                with a hairline under them to make the grouping structural
                rather than merely typographic. */}
            <p className="m-0 mb-1.5 flex items-center gap-2 px-2.5 pb-1 font-sans text-ops-micro font-bold uppercase text-content">
              <span className="flex-none">{group.title}</span>
              <span aria-hidden className="h-px min-w-0 flex-1 bg-edge" />
            </p>
            {group.items.map((item) => {
              const isActive = active?.href === item.href;
              // navHref(), not item.href: a screen still living at its old
              // /marketing route links THERE until it is ported. Nothing in
              // this nav may 404 — a 404 from our own navigation is
              // indistinguishable from a bug.
              return (
                <Link
                  key={item.href}
                  href={withQuery(navHref(item))}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`relative flex h-ops-nav-item items-center gap-2.5 rounded-md px-2.5 font-sans text-ops-body no-underline transition-colors duration-base ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                    isActive
                      ? "bg-navy-08 font-bold text-content"
                      : group.muted
                        ? "font-semibold text-content-subtle hover:text-content-muted"
                        : "font-semibold text-content-muted hover:text-content"
                  }`}
                >
                  {/* Active rail: navy, not amber. */}
                  {isActive && (
                    <span aria-hidden className="absolute inset-y-1 left-0 w-[2.5px] rounded-sm bg-content" />
                  )}
                  <span className={`inline-flex flex-none ${isActive ? "opacity-100" : "opacity-70"}`}>
                    <NavIcon name={item.icon} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {/* Tier badge — the CEO's priority stack, visible in the nav
                      so Tier 1 is never buried under what we happened to build
                      first. Tier 1 only; badging all three would be noise. */}
                  {item.tier === 1 && (
                    <span
                      title="Tier 1 — carries the number"
                      className="flex-none rounded-sm border border-tone-good px-1 font-sans text-[9px] font-bold leading-[14px] text-tone-good"
                    >
                      T1
                    </span>
                  )}
                  {item.externalHref && (
                    <span title="not ported yet — opens the current screen" className="flex-none font-sans text-ops-micro text-content-subtle">
                      ↗
                    </span>
                  )}
                  {item.href === "/admin/leads" && leadCount !== undefined && (
                    <span className="flex-none rounded-pill bg-navy-08 px-1.5 py-[1px] font-sans text-ops-micro font-bold tabular-nums text-content-muted">
                      {leadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}
