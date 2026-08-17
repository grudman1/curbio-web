"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { HUB_NAV_GROUPS, HUB_SURFACE_BY_SLUG, hubPath } from "@/config/marketingHub";
import { STATUS_TONE } from "./hubUi";

// The marketing sidebar: four groups from config/marketingHub.ts, each item a
// real route with the wiring-status dot the old tab strip carried. Layout
// modes (full / icons under 1100px / top drawer on mobile) are pure CSS in the
// layout; the only state here is whether the mobile drawer is open.

/** Quiet 16px geometric line icons — one per surface, stroke-only, inherits
 *  currentColor. These exist for the collapsed sidebar; at full width they sit
 *  beside the labels at 75% opacity so the labels stay the loudest thing. */
function NavIcon({ slug }: { slug: string }) {
  const paths: Record<string, React.ReactNode> = {
    today: (
      <>
        <circle cx="8" cy="8" r="5.8" />
        <path d="M8 8 L10.8 5.4" />
      </>
    ),
    report: (
      <>
        <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
        <path d="M2.5 7h11M7 2.5v11" />
      </>
    ),
    channels: (
      <>
        <path d="M2 8h4.5M6.5 8C9 8 9 4 11.5 4M6.5 8C9 8 9 12 11.5 12" />
        <circle cx="13" cy="4" r="1.2" />
        <circle cx="13" cy="12" r="1.2" />
      </>
    ),
    markets: (
      <>
        <path d="M8 14C8 14 12.5 9.6 12.5 6.4A4.5 4.5 0 1 0 3.5 6.4C3.5 9.6 8 14 8 14Z" />
        <circle cx="8" cy="6.4" r="1.5" />
      </>
    ),
    attribution: <path d="M1.5 8.5h2.6L5.8 4l3.2 8 1.6-3.5h3.9" />,
    links: (
      <>
        <path d="M6.6 9.4 9.4 6.6" />
        <path d="M7.2 4.6 8.6 3.2a2.7 2.7 0 0 1 3.8 3.8L11 8.4" />
        <path d="M8.8 11.4 7.4 12.8a2.7 2.7 0 0 1-3.8-3.8L5 7.6" />
      </>
    ),
    contacts: (
      <>
        <circle cx="8" cy="5.2" r="2.5" />
        <path d="M3.2 13.5C3.2 10.9 5.3 9.6 8 9.6s4.8 1.3 4.8 3.9" />
      </>
    ),
    forms: (
      <>
        <rect x="3.5" y="2" width="9" height="12" rx="1" />
        <path d="M6 5.5h4M6 8h4M6 10.5h2.5" />
      </>
    ),
    partners: (
      <>
        <circle cx="5.5" cy="5.5" r="2" />
        <circle cx="10.5" cy="5.5" r="2" />
        <path d="M2 13.2c0-2.3 1.6-3.6 3.5-3.6 1.3 0 2.4.6 3 1.6M9.6 9.8c.3-.1.6-.2.9-.2 1.9 0 3.5 1.3 3.5 3.6" />
      </>
    ),
    outreach: (
      <>
        <path d="M14 2 2 6.8l4.7 2.5L9.2 14 14 2Z" />
        <path d="M6.7 9.3 14 2" />
      </>
    ),
    events: (
      <>
        <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
        <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
      </>
    ),
    executive: (
      <>
        <rect x="2" y="3" width="12" height="8" rx="1" />
        <path d="M8 11v2.2M5.5 14.2h5M4.8 8.6 6.8 6.4l1.8 1.4 2.4-2.6" />
      </>
    ),
    settings: (
      <>
        <path d="M2.5 5h11M2.5 11h11" />
        <circle cx="6.2" cy="5" r="1.7" />
        <circle cx="10.2" cy="11" r="1.7" />
      </>
    ),
  };
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[slug] ?? <circle cx="8" cy="8" r="5.8" />}
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Navigating between screens keeps the header's timeframe and attribution
  // state — the whole point of putting that state in the URL.
  const qs = searchParams.toString();
  const withQuery = (href: string) => (qs ? `${href}?${qs}` : href);

  const activeSurface = HUB_NAV_GROUPS.flatMap((g) => g.slugs)
    .map((slug) => HUB_SURFACE_BY_SLUG[slug])
    .find((s) => {
      const href = hubPath(s.slug);
      return href === "/marketing" ? pathname === "/marketing" : pathname.startsWith(href);
    });

  const nav = (
    <nav
      id="mk-nav"
      className={`mk-nav${open ? " is-open" : ""}`}
      aria-label="Marketing sections"
    >
      {HUB_NAV_GROUPS.map((g) => (
        <div key={g.title} className="mk-group">
          <p className="mk-group-title">{g.title}</p>
          {g.slugs.map((slug) => {
            const s = HUB_SURFACE_BY_SLUG[slug];
            const href = hubPath(slug);
            const active =
              href === "/marketing" ? pathname === "/marketing" : pathname.startsWith(href);
            return (
              <Link
                key={slug}
                href={withQuery(href)}
                aria-current={active ? "page" : undefined}
                className={`mk-item${active ? " is-active" : ""}`}
                title={s.label}
                onClick={() => setOpen(false)}
              >
                <span className="mk-icon">
                  <NavIcon slug={slug} />
                </span>
                <span className="mk-item-label">{s.label}</span>
                <span
                  className="mk-dot"
                  aria-hidden
                  title={`wiring: ${s.status}`}
                  style={{
                    background: s.status === "waiting" ? "transparent" : STATUS_TONE[s.status],
                    borderColor: STATUS_TONE[s.status],
                  }}
                />
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="mk-mobilebar">
        <button
          type="button"
          className="mk-drawer-toggle"
          aria-expanded={open}
          aria-controls="mk-nav"
          onClick={() => setOpen(!open)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M1.5 3h11M1.5 7h11M1.5 11h11" />
          </svg>
          {activeSurface?.label ?? "Marketing"}
        </button>
      </div>
      {nav}
    </>
  );
}
