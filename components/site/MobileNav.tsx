"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { isCurrent, isGroup, type NavItem, type SiteNavigation } from "@/config/navigation";

// Selector for everything focusable inside the panel. Used by the focus trap.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobile navigation panel.
 *
 * Accessibility is built in rather than retrofitted, because retrofitting a
 * focus trap onto a shipped nav is how you end up with a keyboard dead-end:
 *
 *   • role="dialog" + aria-modal so assistive tech treats it as a layer
 *   • focus moves INTO the panel on open and RETURNS to the trigger on close
 *   • Tab and Shift+Tab cycle within the panel; focus cannot escape behind it
 *   • Escape closes
 *   • body scroll is locked while open
 *   • the trigger owns aria-expanded / aria-controls (see SiteHeader)
 */
export function MobileNav({
  open,
  onClose,
  navigation,
  pathname,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  navigation: SiteNavigation;
  pathname: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus in on open, restore it to the trigger on close. Restoring is
  // the half everyone forgets — without it, closing the menu drops the user at
  // the top of the document with no idea where they are.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Captured now rather than read in cleanup: the trigger button outlives the
    // panel, so this is the same node either way, and reading a ref during
    // cleanup is a foot-gun the lint rule is right to flag.
    const trigger = triggerRef.current;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => {
      (trigger ?? previouslyFocused)?.focus();
    };
  }, [open, triggerRef]);

  // Escape to close, plus the Tab cycle.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      // Wrap in both directions. Without this, Tab walks out of the panel and
      // into the page behind it, which is still rendered.
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Lock background scroll while the panel is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      // No md:hidden — the burger that opens this panel is visible up to 980px
      // (the header's CSS breakpoint), which is wider than Tailwind's md.
      className="fixed inset-0 z-overlay bg-surface"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      ref={panelRef}
    >
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-12 pt-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-pill px-4 text-small font-bold text-content"
          >
            Close
          </button>
        </div>

        <nav aria-label="Primary">
          <ul className="flex flex-col gap-2">
            {navigation.primary.map((item) => (
              <li key={item.label}>
                <MobileItem item={item} pathname={pathname} onNavigate={onClose} />
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href={navigation.cta.href}
          onClick={onClose}
          className="mt-8 flex min-h-[52px] items-center justify-center rounded-pill bg-accent px-6 text-body font-bold text-content-on-accent"
        >
          {navigation.cta.label}
        </Link>
      </div>
    </div>
  );
}

/**
 * A single nav item on mobile. Dropdowns become plain <details> disclosures —
 * native semantics beat a hand-rolled accordion here: correct roles, correct
 * keyboard behaviour, and correct announcement, for free.
 */
function MobileItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  if (item.kind === "link") {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={isCurrent(item.href, pathname) ? "page" : undefined}
        className="flex min-h-[44px] items-center text-h4 font-semibold text-content aria-[current=page]:text-content-accent"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <details className="border-b border-edge">
      <summary className="flex min-h-[44px] cursor-pointer items-center text-h4 font-semibold text-content">
        {item.label}
      </summary>
      <ul className="flex flex-col gap-1 pb-4 pl-4">
        {item.children.map((child) =>
          isGroup(child) ? (
            <li key={child.label}>
              <p className="pt-3 text-label font-black uppercase tracking-[var(--tracking-label)] text-content-subtle">
                {child.label}
              </p>
              <ul className="flex flex-col">
                {child.items.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onNavigate}
                      aria-current={isCurrent(link.href, pathname) ? "page" : undefined}
                      className="flex min-h-[44px] items-center text-body text-content-muted aria-[current=page]:text-content-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ) : (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onNavigate}
                aria-current={isCurrent(child.href, pathname) ? "page" : undefined}
                className="flex min-h-[44px] items-center text-body text-content-muted aria-[current=page]:text-content-accent"
              >
                {child.label}
              </Link>
            </li>
          )
        )}
      </ul>
    </details>
  );
}
