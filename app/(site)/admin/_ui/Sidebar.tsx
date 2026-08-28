"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_NAV, navItemFor, type NavGroup } from "@/config/adminNav";
import { NavIcon } from "./NavIcon";
import { Icon } from "./Icon";

// ─────────────────────────────────────────────────────────────────────────────
// THE sidebar. One rail for the whole app — light product treatment
// (DESIGN-APP.md): white ground, hairline edge, filled rounded active item in
// the brand tint, neutral tier chips. Collapsible to an icon rail; the choice
// persists per browser.
//
// NOTHING HERE LINKS OUT. Every item is an internal route rendering inside
// this shell; there are no external hrefs, no target="_blank", no ↗ glyphs.
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSE_KEY = "admin.sidebar.collapsed";

function NavGroupBlock({
  group,
  activeHref,
  withQuery,
  onNavigate,
  leadCount,
  collapsed,
}: {
  group: NavGroup;
  activeHref: string | null;
  withQuery: (href: string) => string;
  onNavigate: () => void;
  leadCount?: number;
  collapsed: boolean;
}) {
  return (
    <div className="mt-4 first:mt-1">
      {collapsed ? (
        <div aria-hidden className="mx-2.5 mb-1.5 border-t border-app-border first:hidden" />
      ) : (
        <p className="m-0 mb-1 px-2.5 font-sans text-ops-micro font-bold uppercase text-content-subtle">
          {group.title}
        </p>
      )}
      {group.items.map((item) => {
        const isActive = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={withQuery(item.href)}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={`relative mx-0 flex h-ops-nav-item items-center gap-2.5 rounded-md font-sans text-ops-body no-underline transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
              collapsed ? "justify-center px-0" : "px-2.5"
            } ${
              isActive
                ? "bg-app-nav-active font-bold text-brand"
                : "font-semibold text-content-muted hover:bg-app-well hover:text-content"
            }`}
          >
            <span className={`inline-flex flex-none ${isActive ? "opacity-100" : "opacity-70"}`}>
              <NavIcon name={item.icon} />
            </span>
            {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
            {!collapsed && item.tier === 1 && (
              <span
                title="Tier 1 — carries the number"
                className="flex-none rounded-sm bg-pill-neutral-bg px-1 font-sans text-[9px] font-bold leading-[14px] text-pill-neutral-fg"
              >
                T1
              </span>
            )}
            {!collapsed && item.href === "/admin/leads" && leadCount !== undefined && (
              <span className="flex-none rounded-pill bg-pill-neutral-bg px-1.5 py-[1px] font-sans text-ops-micro font-bold tabular-nums text-pill-neutral-fg">
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
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false);

  // Persisted preference; storage can be empty or throwing (private mode) and
  // the rail must render either way.
  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

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
      <div className="sticky top-0 z-40 flex items-center gap-2.5 border-b border-app-border bg-app-card px-4 py-2.5 md:hidden">
        <Link href={withQuery("/admin")} onClick={close} className="flex flex-none items-center" aria-label="Curbio Ops — Today">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/curbio-navy.svg" alt="Curbio" width={100} height={26} className="h-[22px] w-auto" />
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-nav"
          onClick={() => setOpen(!open)}
          className="ml-auto flex cursor-pointer items-center gap-2 rounded-md border border-app-border-strong bg-app-card px-2.5 py-1.5 font-sans text-ops-label font-bold text-content"
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
        className={`${open ? "flex" : "hidden"} w-full flex-none flex-col border-r border-app-border bg-app-card px-2.5 pb-3 md:sticky md:top-0 md:flex md:h-screen md:self-start ${
          collapsed ? "md:w-ops-sidebar-collapsed md:px-2" : "md:w-ops-sidebar"
        }`}
      >
        {/* Carries the query like every other link: the logo goes to Today,
            and going to Today must not silently reset the timeframe you were
            reading everything else through. */}
        <Link
          href={withQuery("/admin")}
          onClick={close}
          aria-label="Curbio Ops — Today"
          className={`hidden h-ops-header flex-none items-center md:flex ${collapsed ? "justify-center px-0" : "px-2.5"}`}
        >
          {collapsed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo/curbio-icon.png" alt="Curbio" width={22} height={22} className="h-[22px] w-auto" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo/curbio-navy.svg" alt="Curbio" width={104} height={27} className="h-[26px] w-auto" />
          )}
        </Link>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-1">
          {ADMIN_NAV.map((g) => (
            <NavGroupBlock key={g.title} group={g} {...shared} collapsed={collapsed} />
          ))}
        </div>

        {/* Collapse toggle — desktop only; mobile uses the drawer. */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-pressed={collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`mt-2 hidden h-[30px] flex-none cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent font-sans text-ops-label font-semibold text-content-subtle transition-colors duration-fast ease-out hover:bg-app-well hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent md:flex ${
            collapsed ? "justify-center px-0" : "px-2.5"
          }`}
        >
          <Icon name={collapsed ? "chevron-right" : "chevron-left"} size={13} />
          {!collapsed && "Collapse"}
        </button>
      </nav>
    </>
  );
}
