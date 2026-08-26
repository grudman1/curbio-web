"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV, ADMIN_NAV_PINNED, navItemFor, type NavGroup } from "@/config/adminNav";
import { NavIcon } from "./NavIcon";

// ─────────────────────────────────────────────────────────────────────────────
// THE sidebar. One rail for what used to be two apps.
//
// Navy, matching app.curbio.com — the two tools should look like they came
// from the same company, because they did. The navy is the BRAND token
// (--color-surface-inverse → --navy), not a value copied off a mockup.
//
// NOTHING HERE LINKS OUT. Every item is an internal route rendering inside
// this shell; there are no external hrefs, no target="_blank", no ↗ glyphs.
//
// Colour rules, from the app's chrome:
//   idle    white at ~70%
//   hover   full white on a subtly lighter navy
//   active  full white, lighter navy, AMBER left edge
//
// Amber appears in exactly one place on this rail — the active indicator. It
// is the one signal that survived the "amber is signal-only" rule inside
// /admin because on a navy ground it is not competing with a warning tone;
// nothing on this rail carries state.
// ─────────────────────────────────────────────────────────────────────────────

function NavGroupBlock({
  group,
  activeHref,
  withQuery,
  onNavigate,
  leadCount,
}: {
  group: NavGroup;
  activeHref: string | null;
  withQuery: (href: string) => string;
  onNavigate: () => void;
  leadCount?: number;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="m-0 mb-1.5 px-3 font-sans text-ops-micro font-bold uppercase text-white/45">
        {group.title}
      </p>
      {group.items.map((item) => {
        const isActive = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={withQuery(item.href)}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={`relative flex h-ops-nav-item items-center gap-2.5 rounded-md px-3 font-sans text-ops-body no-underline transition-colors duration-base ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
              isActive
                ? "bg-white/[0.10] font-bold text-white"
                : "font-semibold text-white/70 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            {isActive && (
              <span aria-hidden className="absolute inset-y-[3px] left-0 w-[3px] rounded-sm bg-accent" />
            )}
            <span className={`inline-flex flex-none ${isActive ? "opacity-100" : "opacity-65"}`}>
              <NavIcon name={item.icon} />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.tier === 1 && (
              <span
                title="Tier 1 — carries the number"
                className="flex-none rounded-sm border border-white/30 px-1 font-sans text-[9px] font-bold leading-[14px] text-white/70"
              >
                T1
              </span>
            )}
            {item.href === "/admin/leads" && leadCount !== undefined && (
              <span className="flex-none rounded-pill bg-white/15 px-1.5 py-[1px] font-sans text-ops-micro font-bold tabular-nums text-white/80">
                {leadCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar({ leadCount }: { leadCount?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Navigating carries the header's timeframe and attribution state — one
  // global state that never resets as you move between screens.
  const qs = searchParams.toString();
  const withQuery = (href: string) => (qs ? `${href}?${qs}` : href);
  const active = navItemFor(pathname);
  const close = () => setOpen(false);

  const shared = { activeHref: active?.href ?? null, withQuery, onNavigate: close, leadCount };

  return (
    <>
      {/* Mobile: the drawer toggle, labelled with where you are. */}
      <div className="sticky top-0 z-40 flex items-center gap-2.5 bg-surface-inverse px-4 py-2.5 md:hidden">
        <Link href={withQuery("/admin")} onClick={close} className="flex flex-none items-center" aria-label="Curbio Ops — Today">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/curbio-white.svg" alt="Curbio" width={100} height={26} className="h-[22px] w-auto" />
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-nav"
          onClick={() => setOpen(!open)}
          className="ml-auto flex cursor-pointer items-center gap-2 rounded-md border-0 bg-white/10 px-2.5 py-1.5 font-sans text-ops-label font-bold text-white"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M1.5 3h11M1.5 7h11M1.5 11h11" />
          </svg>
          {active?.label ?? "Menu"}
        </button>
      </div>

      <nav
        id="admin-nav"
        aria-label="Ops sections"
        className={`${
          open ? "flex" : "hidden"
        } w-full flex-none flex-col bg-surface-inverse px-2.5 pb-4 md:sticky md:top-0 md:flex md:h-screen md:w-ops-sidebar md:self-start md:px-2.5 md:pb-4`}
      >
        {/* Logo slot — the same asset the campaign landing pages use, so the
            two surfaces are unmistakably one product. */}
        {/* Carries the query like every other link: the logo goes to Today,
            and going to Today must not silently reset the timeframe you were
            reading everything else through. */}
        <Link
          href={withQuery("/admin")}
          onClick={close}
          aria-label="Curbio Ops — Today"
          className="hidden h-ops-header flex-none items-center px-3 md:flex"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/curbio-white.svg" alt="Curbio" width={108} height={28} className="h-[28px] w-auto" />
        </Link>

        <div className="min-h-0 flex-1 overflow-y-auto pt-1">
          {ADMIN_NAV.map((g) => (
            <NavGroupBlock key={g.title} group={g} {...shared} />
          ))}
        </div>

        {/* Pinned. A destination you reach deliberately, not one you scan past. */}
        <div className="flex-none border-t border-white/10 pt-2">
          {ADMIN_NAV_PINNED.items.map((item) => {
            const isActive = active?.href === item.href;
            return (
              <Link
                key={item.href}
                href={withQuery(item.href)}
                aria-current={isActive ? "page" : undefined}
                onClick={close}
                className={`relative flex h-ops-nav-item items-center gap-2.5 rounded-md px-3 font-sans text-ops-body no-underline transition-colors duration-base ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                  isActive
                    ? "bg-white/[0.10] font-bold text-white"
                    : "font-semibold text-white/70 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {isActive && (
                  <span aria-hidden className="absolute inset-y-[3px] left-0 w-[3px] rounded-sm bg-accent" />
                )}
                <span className={`inline-flex flex-none ${isActive ? "opacity-100" : "opacity-65"}`}>
                  <NavIcon name={item.icon} />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
