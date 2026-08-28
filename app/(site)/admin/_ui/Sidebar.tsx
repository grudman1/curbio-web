"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavIcon } from "./NavIcon";
import { Icon } from "./Icon";

// ─────────────────────────────────────────────────────────────────────────────
// THE sidebar — v3 (2026-08 accordion redesign, supersedes the v2 hover
// accordion below it in git history).
//
// EXPAND ON CLICK, NEVER HOVER. A parent row with children is a pure
// disclosure toggle — it does not navigate itself, only its children do.
// Multiple sections can be open at once; which ones is persisted to
// localStorage, independent of which route is current, so it survives
// navigation exactly the way a user left it. The one thing that overrides
// that memory: whichever section CONTAINS the active route is always forced
// open (on first load and on every navigation, including ⌘K), without ever
// closing a section the user opened themselves.
//
// Collapsed (48px) mode is unchanged in kind: an icon rail with a flyout
// standing in for the accordion, but the flyout now opens on click too, not
// hover, so both rail states use the same interaction model.
//
// NOTHING HERE LINKS OUT. Every item is an internal route rendering inside
// this shell; there are no external hrefs, no target="_blank", no ↗ glyphs.
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSE_KEY = "admin.sidebar.v2.collapsed";
const OPEN_KEY = "admin.sidebar.v3.open";

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
 *  section — checked only via subItems when they exist, so a parent row
 *  whose own href duplicates its first child's never wins the tie and
 *  swallows the sub-item match. */
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

function loadOpenKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}
function saveOpenKeys(keys: Set<string>) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify([...keys]));
  } catch {}
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
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const [flyoutKey, setFlyoutKey] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState<number | null>(null);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setRailCollapsed(true);
    } catch {}
    setOpenKeys(loadOpenKeys());
  }, []);

  const { topKey, subLabel } = useMemo(() => deriveActive(items, pathname), [items, pathname]);

  // The active section is always open — on first load and on every URL or
  // ⌘K navigation — but this only ever ADDS a key, never removes one, so a
  // section the user opened by hand stays open when they navigate elsewhere.
  useEffect(() => {
    if (!topKey) return;
    setOpenKeys((prev) => {
      if (prev.has(topKey)) return prev;
      const next = new Set(prev).add(topKey);
      saveOpenKeys(next);
      return next;
    });
  }, [topKey]);

  // Collapsed-rail flyout: click-outside and Escape close it, same as any
  // other click-triggered overlay in the app.
  useEffect(() => {
    if (!flyoutKey) return;
    function onDocClick(e: MouseEvent) {
      if (!navRef.current?.contains(e.target as Node)) setFlyoutKey(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFlyoutKey(null);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [flyoutKey]);

  function toggleSection(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveOpenKeys(next);
      return next;
    });
  }

  function toggleRail() {
    setFlyoutKey(null);
    setRailCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  function clickRow(key: string) {
    if (railCollapsed) {
      setFlyoutKey((k) => {
        const next = k === key ? null : key;
        if (next) setFlyoutTop(rowRefs.current[key]?.getBoundingClientRect().top ?? null);
        return next;
      });
    } else {
      toggleSection(key);
    }
  }

  const qs = searchParams.toString();
  const withQuery = (href: string) => (qs ? `${href}?${qs}` : href);
  const closeMobile = () => setMobileOpen(false);

  const activeLabel = items.find((i) => i.key === topKey)?.label ?? "Menu";
  const flyoutItem = railCollapsed && flyoutKey ? items.find((i) => i.key === flyoutKey) : undefined;
  const iconSize = railCollapsed ? 22 : 20;

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
        ref={navRef}
        id="admin-nav"
        aria-label="Control Room"
        style={railCollapsed ? undefined : { width: 220, minWidth: 200, maxWidth: 320 }}
        className={`${mobileOpen ? "flex" : "hidden"} w-full flex-none flex-col border-r border-app-border bg-app-card md:sticky md:top-0 md:flex md:h-screen md:self-start ${
          railCollapsed ? "md:w-[48px] transition-[width] duration-fast ease-out" : "md:resize-x md:overflow-auto"
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
              <span className="flex-none rounded-sm bg-pill-neutral-bg px-2 py-[3px] font-sans text-[13px] font-bold leading-none tracking-[.06em] text-pill-neutral-fg">
                {brandBadge}
              </span>
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-1">
          {items.map((item) => {
            const hasSub = !!item.subItems?.length;
            const isActiveTop = item.key === topKey;

            // Home, or any childless top-level row: a real link. It never
            // gets a chevron or a count — there's nothing under it to disclose.
            if (!hasSub) {
              return (
                <Link
                  key={item.key}
                  href={withQuery(item.href)}
                  onClick={closeMobile}
                  title={railCollapsed ? item.label : undefined}
                  aria-current={isActiveTop ? "page" : undefined}
                  className={`mx-2.5 mb-0.5 flex h-11 items-center gap-2.5 rounded-full font-sans text-ops-body no-underline transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                    railCollapsed ? "justify-center px-0" : "px-3"
                  } ${
                    isActiveTop
                      ? "bg-app-well font-bold text-content"
                      : "font-semibold text-content-muted hover:bg-app-well hover:text-content"
                  }`}
                >
                  <span className="inline-flex flex-none">
                    <NavIcon name={item.icon} size={iconSize} />
                  </span>
                  {!railCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                </Link>
              );
            }

            // A section: click toggles it open/closed (or its flyout, when
            // the rail is collapsed). It never navigates on its own.
            const isOpen = !railCollapsed && openKeys.has(item.key);
            return (
              <div
                key={item.key}
                ref={(el) => {
                  rowRefs.current[item.key] = el;
                }}
              >
                <button
                  type="button"
                  onClick={() => clickRow(item.key)}
                  title={railCollapsed ? item.label : undefined}
                  aria-expanded={railCollapsed ? flyoutKey === item.key : isOpen}
                  className={`mx-2.5 mb-0.5 flex h-11 w-[calc(100%-20px)] cursor-pointer items-center gap-2.5 rounded-full border-0 text-left font-sans text-ops-body transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                    railCollapsed ? "justify-center bg-transparent px-0" : "px-3"
                  } ${
                    isOpen
                      ? "bg-navy font-bold text-white"
                      : isActiveTop
                        ? "bg-app-well font-bold text-content"
                        : "bg-transparent font-semibold text-content-muted hover:bg-app-well hover:text-content"
                  }`}
                >
                  <span className="inline-flex flex-none">
                    <NavIcon name={item.icon} size={iconSize} />
                  </span>
                  {!railCollapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {isOpen ? (
                        <Icon name="chevron-down" size={13} className="flex-none text-amber" />
                      ) : (
                        <span className="flex flex-none items-center gap-1.5">
                          <span className="font-sans text-ops-label font-medium tabular-nums text-nav3-gray-400">
                            {item.subItems!.length}
                          </span>
                          <Icon name="chevron-right" size={13} className="text-nav3-gray-400" />
                        </span>
                      )}
                    </>
                  )}
                </button>

                {!railCollapsed && (
                  <div
                    className="grid overflow-hidden transition-[grid-template-rows] duration-fast ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="min-h-0">
                      <div className="ml-6 border-l border-app-border">
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
            className={`mx-2.5 flex h-9 items-center rounded-md text-nav3-muted-text transition-colors duration-fast ease-out hover:bg-app-well hover:text-nav3-hover-text aria-[current=page]:text-nav3-hover-text ${
              railCollapsed ? "justify-center px-0" : "w-9 justify-center"
            }`}
          >
            <NavIcon name="gear" size={18} />
          </Link>

          <button
            type="button"
            title={`${user.name} · ${user.role}`}
            className={`flex w-full items-center gap-2 py-2 text-left transition-colors duration-fast ease-out hover:bg-app-well ${
              railCollapsed ? "justify-center px-0" : "px-2.5"
            }`}
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-navy font-sans text-[11px] font-bold text-white">
              {user.initials}
            </span>
            {!railCollapsed && (
              <span className="min-w-0 flex-1 truncate font-sans text-[12px] text-nav3-muted-text">{user.name}</span>
            )}
          </button>

          {/* Drag the nav's own right edge to resize (200–320px) — this is a
              subtle affordance, not a prominent arrow button. Collapsing to
              the 48px icon rail is a separate, discrete action. */}
          <button
            type="button"
            onClick={toggleRail}
            aria-pressed={railCollapsed}
            title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-5 w-full flex-none items-center justify-center border-t border-app-border text-content-subtle opacity-60 transition-opacity duration-fast ease-out hover:opacity-100 md:flex"
          >
            <Icon name={railCollapsed ? "chevron-right" : "chevron-left"} size={10} />
          </button>
        </div>
      </nav>

      {/* Collapsed-rail flyout — click-triggered, click-outside/Escape to
          close (see the effect above). Fixed, not absolute: the items list
          scrolls with overflow-hidden on the x-axis, so anything meant to
          escape that column has to escape the DOM position entirely. */}
      {flyoutItem && flyoutTop !== null && (
        <div
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
              variant="flyout"
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
  variant = "list",
}: {
  sub: NavSubItem;
  href: string;
  active: boolean;
  badge?: number;
  onClick?: () => void;
  /** "list": inside the bordered accordion (40px indent). "flyout": inside
   *  the collapsed-rail popover, which has no hairline of its own. */
  variant?: "list" | "flyout";
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`mx-2 flex h-[38px] items-center gap-2 rounded-lg text-[14px] no-underline transition-colors duration-fast ease-out ${
        variant === "list" ? "pl-4" : "pl-3"
      } pr-3 ${
        active
          ? "bg-nav3-child-active-bg font-semibold text-content"
          : "font-medium text-nav3-child-text hover:bg-app-well hover:text-nav3-hover-text"
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
