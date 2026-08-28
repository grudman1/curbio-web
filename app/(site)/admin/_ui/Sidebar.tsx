"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavIcon } from "./NavIcon";
import { Icon } from "./Icon";

// ─────────────────────────────────────────────────────────────────────────────
// THE sidebar — v4 (2026-08 single-open accordion + drag-resize redesign).
//
// EXPAND ON CLICK, NEVER HOVER. A parent row with children is a pure
// disclosure toggle — it does not navigate itself, only its children do.
//
// ONE SECTION OPEN AT A TIME (reversed from v3, which allowed several).
// Clicking a section's header opens it and closes whichever other section was
// open; clicking the open one again closes it. Which single section is open
// persists to localStorage. The one thing that overrides that memory: the
// section CONTAINING the active route is forced open on every load and every
// navigation (URL or ⌘K) — closing whatever else was open, on purpose, since
// there is only ever one slot now.
//
// THE COLLAPSED ICON-RAIL MODE IS GONE. Its toggle button was already pulled
// in #94 ("no collapse toggle — drag-to-resize the right edge is [the only
// mechanism]"), leaving `railCollapsed` reachable only by a stale localStorage
// value from before that cut — this redesign finishes the job and removes the
// dead state, the flyout popover, and every icon-only render branch with it.
// Width now varies continuously between MIN_WIDTH and MAX_WIDTH by dragging
// the handle on the right edge (full height, not just the old CSS `resize`
// corner grip) — there is no second, discontinuous "collapsed" state to fall
// into.
//
// SETTINGS is a normal row in `items` now (config/adminNav.ts), rendered by
// the same childless-row branch as Home — it is no longer hardcoded here.
// The account chip and sign-out control moved to the header (AppShell.tsx):
// neither is navigation, and the sidebar's own bottom is empty as a result
// (the CookieYes badge is free to sit there without a footer to collide with).
//
// NOTHING HERE LINKS OUT. Every item is an internal route rendering inside
// this shell; there are no external hrefs, no target="_blank", no ↗ glyphs.
// ─────────────────────────────────────────────────────────────────────────────

const OPEN_KEY = "admin.sidebar.v4.open";
const WIDTH_KEY = "admin.sidebar.v4.width";
const DEFAULT_WIDTH = 220;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

const clampWidth = (w: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));

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

function loadOpenKey(): string | null {
  try {
    return localStorage.getItem(OPEN_KEY);
  } catch {
    return null;
  }
}
function saveOpenKey(key: string | null) {
  try {
    if (key) localStorage.setItem(OPEN_KEY, key);
    else localStorage.removeItem(OPEN_KEY);
  } catch {}
}

export function Sidebar({
  items,
  leadCount,
  brandBadge = "OPS",
}: {
  items: NavTopItem[];
  /** Live count merged onto whichever sub-item is /admin/leads. */
  leadCount?: number;
  brandBadge?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const widthRef = useRef(width);

  useEffect(() => {
    setOpenKey(loadOpenKey());
    try {
      const raw = localStorage.getItem(WIDTH_KEY);
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n)) {
        const w = clampWidth(n);
        setWidth(w);
        widthRef.current = w;
      }
    } catch {}
  }, []);

  const { topKey, subLabel } = useMemo(() => deriveActive(items, pathname), [items, pathname]);

  // The active section is always the (only) open one — on first load and on
  // every URL or ⌘K navigation. Single-slot by construction, so opening it
  // closes whatever else was open; that reversal from the old multi-open
  // behavior is the point of this redesign, not a side effect of it.
  useEffect(() => {
    if (!topKey) return;
    setOpenKey(topKey);
    saveOpenKey(topKey);
  }, [topKey]);

  function toggleSection(key: string) {
    setOpenKey((prev) => {
      const next = prev === key ? null : key;
      saveOpenKey(next);
      return next;
    });
  }

  // Drag-resize — the full-height handle, not the old CSS `resize` corner
  // grip. Width tracks the pointer directly (no animation to fight); MIN/MAX
  // are enforced in JS on every move, not just visually via CSS, so a very
  // fast drag can never overshoot before the next frame clamps it.
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = navRef.current?.getBoundingClientRect().width ?? widthRef.current;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    setResizing(true);

    function onMove(ev: PointerEvent) {
      const next = clampWidth(startWidth + (ev.clientX - startX));
      widthRef.current = next;
      setWidth(next);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      setResizing(false);
      try {
        localStorage.setItem(WIDTH_KEY, String(widthRef.current));
      } catch {}
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }, []);

  const qs = searchParams.toString();
  const withQuery = (href: string) => (qs ? `${href}?${qs}` : href);
  const closeMobile = () => setMobileOpen(false);

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
        ref={navRef}
        id="admin-nav"
        aria-label="Control Room"
        style={{ width, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }}
        className={`${mobileOpen ? "flex" : "hidden"} relative w-full flex-none flex-col border-r border-app-border bg-app-card md:sticky md:top-0 md:flex md:h-screen md:self-start ${
          resizing ? "" : "transition-[width] duration-fast ease-out"
        }`}
      >
        {/* Full-height drag handle — replaces the old CSS `resize: horizontal`,
            which only offered a grab point in the bottom-right corner. The 4px
            hit target is wider than the 1px line it shows on hover/drag, so
            the handle is easy to find without being visually loud at rest. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onPointerDown={onHandlePointerDown}
          className="group absolute inset-y-0 right-0 z-10 hidden w-1 cursor-col-resize touch-none select-none md:block"
        >
          <div
            className={`mx-auto h-full w-px transition-colors duration-fast ${
              resizing ? "bg-navy" : "bg-transparent group-hover:bg-navy"
            }`}
          />
        </div>

        <div className="hidden h-ops-header flex-none items-center gap-1.5 px-2.5 md:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/curbio-navy.svg" alt="Curbio" width={84} height={22} className="h-[19px] w-auto flex-none" />
          <span className="flex-none rounded-sm bg-pill-neutral-bg px-2 py-[3px] font-sans text-[13px] font-bold leading-none tracking-[.06em] text-pill-neutral-fg">
            {brandBadge}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-1">
          {items.map((item) => {
            const hasSub = !!item.subItems?.length;
            const isActiveTop = item.key === topKey;

            // Home, Settings, or any other childless top-level row: a real
            // link. It never gets a chevron or a count — there's nothing
            // under it to disclose.
            if (!hasSub) {
              return (
                <Link
                  key={item.key}
                  href={withQuery(item.href)}
                  onClick={closeMobile}
                  aria-current={isActiveTop ? "page" : undefined}
                  className={`mx-2.5 mb-0.5 flex h-11 items-center gap-2.5 rounded-full px-3 font-sans text-ops-body no-underline transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                    isActiveTop
                      ? "bg-app-well font-bold text-content"
                      : "font-semibold text-content-muted hover:bg-app-well hover:text-content"
                  }`}
                >
                  <span className="inline-flex flex-none">
                    <NavIcon name={item.icon} size={20} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            }

            // A section: click toggles it open/closed. It never navigates on
            // its own, and opening it closes whichever other section was open
            // (single-slot `openKey`).
            const isOpen = openKey === item.key;
            return (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() => toggleSection(item.key)}
                  aria-expanded={isOpen}
                  className={`mx-2.5 mb-0.5 flex h-11 w-[calc(100%-20px)] cursor-pointer items-center gap-2.5 rounded-full border-0 px-3 text-left font-sans text-ops-body transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                    isOpen
                      ? "bg-navy font-bold text-white"
                      : isActiveTop
                        ? "bg-app-well font-bold text-content"
                        : "bg-transparent font-semibold text-content-muted hover:bg-app-well hover:text-content"
                  }`}
                >
                  <span className="inline-flex flex-none">
                    <NavIcon name={item.icon} size={20} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {isOpen ? (
                    <Icon name="chevron-down" size={13} className="flex-none text-amber" />
                  ) : (
                    <Icon name="chevron-right" size={13} className="flex-none text-nav3-gray-400" />
                  )}
                </button>

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
              </div>
            );
          })}
        </div>

        {/* Bottom is deliberately empty — Settings is a row above like any
            other, and the account chip + sign-out live in the header now.
            The CookieYes badge is free to sit here without a footer to
            collide with. */}
      </nav>
    </>
  );
}

function SubLink({
  sub,
  href,
  active,
  badge,
  onClick,
}: {
  sub: NavSubItem;
  href: string;
  active: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`mx-2 flex h-[38px] items-center gap-2 rounded-lg pl-4 pr-3 text-[14px] no-underline transition-colors duration-fast ease-out ${
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
