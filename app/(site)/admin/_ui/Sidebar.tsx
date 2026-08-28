"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavIcon } from "./NavIcon";
import { Icon } from "./Icon";

// ─────────────────────────────────────────────────────────────────────────────
// THE sidebar (2026-08 redesign). Five rows, no group labels, amber
// left-border active state, Pipedrive/Linear-style accordion sub-items that
// stay open while you're hovering the group (parent OR its children), collapse
// to a 48px icon rail with a hover flyout standing in for the accordion there.
//
// The accordion is a CSS grid-rows 0fr↔1fr transition rather than max-height:
// it animates to the sub-items' natural height with no fixed number to keep
// in sync, and — like every transition in this app — collapses to 0ms under
// prefers-reduced-motion via the global rule in globals.css.
//
// NOTHING HERE LINKS OUT. Every item is an internal route rendering inside
// this shell; there are no external hrefs, no target="_blank", no ↗ glyphs.
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSE_KEY = "admin.sidebar.v2.collapsed";

export type NavSubItem = { label: string; href: string; badge?: number };

export type NavTopItem = {
  key: string;
  label: string;
  /** NavIcon glyph name (app/(site)/admin/_ui/NavIcon.tsx). */
  icon: string;
  /** Where the row itself links — for a row with subItems, its first child. */
  href: string;
  subItems?: NavSubItem[];
};

export type SidebarUser = { initials: string; name: string; role: string };

/** Longest-prefix match: a child route matching makes its PARENT the active
 *  section (point 6 of the redesign brief) — checked only via subItems when
 *  they exist, so a parent row whose own href duplicates its first child's
 *  never wins the tie and swallows the sub-item match. */
function deriveActive(
  items: NavTopItem[],
  pathname: string
): { topKey: string | null; subLabel: string | null } {
  let bestHref = "";
  let topKey: string | null = null;
  let subLabel: string | null = null;
  const consider = (href: string, key: string, label: string | null) => {
    const hit = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
    if (hit && href.length > bestHref.length) {
      bestHref = href;
      topKey = key;
      subLabel = label;
    }
  };
  for (const item of items) {
    const subs = item.subItems ?? [];
    if (subs.length === 0) consider(item.href, item.key, null);
    else for (const sub of subs) consider(sub.href, item.key, sub.label);
  }
  return { topKey, subLabel };
}

export function Sidebar({
  items,
  user,
  leadCount,
  brandBadge = "OPS",
}: {
  items: NavTopItem[];
  user: SidebarUser;
  /** Live count merged onto whichever sub-item is /admin/leads. */
  leadCount?: number;
  brandBadge?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState<number | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setRailCollapsed(true);
    } catch {}
  }, []);

  function toggleRail() {
    setRailCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  const { topKey, subLabel } = useMemo(() => deriveActive(items, pathname), [items, pathname]);

  const qs = searchParams.toString();
  const withQuery = (href: string) => (qs ? `${href}?${qs}` : href);
  const closeMobile = () => setMobileOpen(false);

  // Sub-items appear ONLY on hover — the collapsed/default state is always
  // five bare rows, even on a page inside Channels or Site (that page's
  // top-level row still gets the amber active border; its accordion stays
  // shut until you hover it).
  const openKey = railCollapsed ? null : hoverKey;
  const flyoutItem = railCollapsed && hoverKey ? items.find((i) => i.key === hoverKey) : undefined;

  function enterRow(key: string, hasSub: boolean) {
    if (!hasSub) return;
    setHoverKey(key);
    if (railCollapsed) setFlyoutTop(rowRefs.current[key]?.getBoundingClientRect().top ?? null);
  }
  function leaveRow(key: string) {
    setHoverKey((k) => (k === key ? null : k));
  }

  const activeLabel = items.find((i) => i.key === topKey)?.label ?? "Menu";

  return (
    <>
      {/* Mobile: sticky top bar + drawer toggle, hidden ≥md where the rail is always visible. */}
      <div className="sticky top-0 z-40 flex items-center gap-2.5 border-b border-app-border bg-app-card px-4 py-2.5 md:hidden">
        <Link href={withQuery("/admin")} onClick={closeMobile} className="flex flex-none items-center" aria-label="Curbio Ops — Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/curbio-navy.svg" alt="Curbio" width={100} height={26} className="h-[22px] w-auto" />
        </Link>
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="admin-nav"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto flex cursor-pointer items-center gap-2 rounded-md border border-app-border-strong bg-app-card px-2.5 py-1.5 font-sans text-ops-label font-bold text-content"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M1.5 3h11M1.5 7h11M1.5 11h11" />
          </svg>
          {activeLabel}
        </button>
      </div>

      <nav
        id="admin-nav"
        aria-label="Control Room"
        className={`${mobileOpen ? "flex" : "hidden"} w-full flex-none flex-col border-r border-app-border bg-app-card transition-[width] duration-fast ease-out md:sticky md:top-0 md:flex md:h-screen md:self-start ${
          railCollapsed ? "md:w-[48px]" : "md:w-[220px]"
        }`}
      >
        <div className={`hidden h-ops-header flex-none items-center gap-1.5 md:flex ${railCollapsed ? "justify-center px-0" : "px-2.5"}`}>
          {railCollapsed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo/curbio-icon.png" alt="Curbio" width={20} height={20} className="h-5 w-auto" />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo/curbio-navy.svg" alt="Curbio" width={84} height={22} className="h-[19px] w-auto flex-none" />
              <span className="flex-none rounded-sm bg-pill-neutral-bg px-1 font-sans text-[9px] font-bold leading-[14px] tracking-wide text-pill-neutral-fg">
                {brandBadge}
              </span>
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-1">
          {items.map((item) => {
            const hasSub = !!item.subItems?.length;
            const isActiveTop = item.key === topKey;
            const isOpen = hasSub && openKey === item.key;

            return (
              <div
                key={item.key}
                ref={(el) => {
                  rowRefs.current[item.key] = el;
                }}
                onMouseEnter={() => enterRow(item.key, hasSub)}
                onMouseLeave={() => leaveRow(item.key)}
              >
                <Link
                  href={withQuery(item.href)}
                  onClick={closeMobile}
                  title={railCollapsed ? item.label : undefined}
                  aria-current={isActiveTop && !hasSub ? "page" : undefined}
                  className={`relative mx-2.5 flex h-ops-nav-item items-center gap-2.5 border-l-2 font-sans text-ops-body no-underline transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                    railCollapsed ? "justify-center px-0" : "pl-2"
                  } ${
                    isActiveTop
                      ? "border-accent font-bold text-content"
                      : `border-transparent font-semibold text-content-muted ${
                          isOpen ? "bg-app-well text-content" : "hover:bg-app-well hover:text-content"
                        }`
                  }`}
                >
                  <span className="inline-flex flex-none opacity-80">
                    <NavIcon name={item.icon} />
                  </span>
                  {!railCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                </Link>

                {hasSub && !railCollapsed && (
                  <div
                    className="grid overflow-hidden transition-[grid-template-rows] duration-fast ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="min-h-0">
                      {item.subItems!.map((sub) => (
                        <SubLink
                          key={sub.label}
                          sub={sub}
                          active={isActiveTop && sub.label === subLabel}
                          badge={sub.href === "/admin/leads" ? leadCount ?? sub.badge : sub.badge}
                          href={withQuery(sub.href)}
                          onClick={closeMobile}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-none border-t border-app-border pt-1.5">
          <Link
            href={withQuery("/admin/settings")}
            onClick={closeMobile}
            title="Settings"
            aria-label="Settings"
            aria-current={pathname === "/admin/settings" ? "page" : undefined}
            className={`mx-2.5 flex h-ops-nav-item items-center rounded-md text-content-muted transition-colors duration-fast ease-out hover:bg-app-well hover:text-content aria-[current=page]:text-content ${
              railCollapsed ? "justify-center px-0" : "w-7 justify-center"
            }`}
          >
            <NavIcon name="settings" />
          </Link>

          <button
            type="button"
            title={`${user.name} · ${user.role}`}
            className={`flex w-full items-center gap-2 py-2 text-left transition-colors duration-fast ease-out hover:bg-app-well ${
              railCollapsed ? "justify-center px-0" : "px-2.5"
            }`}
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-subtle font-sans text-[10px] font-bold text-brand">
              {user.initials}
            </span>
            {!railCollapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans text-ops-label font-semibold text-content">{user.name}</span>
                <span className="block truncate font-sans text-[10px] text-content-subtle">{user.role}</span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggleRail}
            aria-pressed={railCollapsed}
            title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-6 w-full flex-none items-center justify-center border-t border-app-border text-content-subtle transition-colors duration-fast ease-out hover:bg-app-well hover:text-content md:flex"
          >
            <Icon name={railCollapsed ? "chevron-right" : "chevron-left"} size={12} />
          </button>
        </div>
      </nav>

      {/* Icon-only flyout — the accordion's stand-in at 48px. Fixed, not
          absolute: the items list scrolls with overflow-hidden on the x-axis,
          so anything meant to escape that column has to escape the DOM
          position entirely, not just the stacking context. */}
      {flyoutItem && flyoutTop !== null && (
        <div
          onMouseEnter={() => setHoverKey(flyoutItem.key)}
          onMouseLeave={() => leaveRow(flyoutItem.key)}
          className="fixed z-50 w-[190px] overflow-hidden rounded-lg border border-app-border bg-app-card py-1 shadow-app-pop motion-safe:animate-[pop-in_120ms_var(--easing-out)] motion-reduce:animate-none"
          style={{ top: flyoutTop, left: 48 }}
        >
          <p className="m-0 truncate px-3 pb-1.5 pt-1 font-sans text-ops-label font-bold text-content-subtle">
            {flyoutItem.label}
          </p>
          {flyoutItem.subItems!.map((sub) => (
            <SubLink
              key={sub.label}
              sub={sub}
              active={topKey === flyoutItem.key && sub.label === subLabel}
              badge={sub.href === "/admin/leads" ? leadCount ?? sub.badge : sub.badge}
              href={withQuery(sub.href)}
              onClick={closeMobile}
              indent={false}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SubLink({
  sub,
  href,
  active,
  badge,
  onClick,
  indent = true,
}: {
  sub: NavSubItem;
  href: string;
  active: boolean;
  badge?: number;
  onClick?: () => void;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`mx-2.5 flex h-7 items-center gap-2 border-l-2 ${indent ? "pl-6" : "pl-3"} pr-2 font-sans text-ops-body no-underline transition-colors duration-fast ease-out ${
        active
          ? "border-accent font-bold text-content"
          : "border-transparent font-medium text-content-subtle hover:text-content"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{sub.label}</span>
      {badge !== undefined && (
        <span className="flex-none rounded-pill bg-pill-neutral-bg px-1.5 py-[1px] font-sans text-ops-micro font-bold tabular-nums text-pill-neutral-fg">
          {badge}
        </span>
      )}
    </Link>
  );
}
