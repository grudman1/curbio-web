"use client";

// ⌘K — jump anywhere. Every nav item and sub-tab, filtered as you type,
// arrow keys + Enter to go. Navigation carries the current query string, so
// jumping never resets the timeframe (same rule as the sidebar).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ADMIN_NAV, ATTRIBUTION_TABS, PARTNERSHIP_TABS } from "@/config/adminNav";
import { Icon } from "./Icon";

type Entry = { href: string; label: string; group: string; keywords: string };

function entries(): Entry[] {
  const out: Entry[] = [];
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      out.push({ href: item.href, label: item.label, group: group.title, keywords: item.label.toLowerCase() });
    }
  }
  for (const t of PARTNERSHIP_TABS.slice(1)) {
    out.push({ href: t.href, label: `Partnerships · ${t.label}`, group: "Channels", keywords: `partnerships ${t.label.toLowerCase()}` });
  }
  for (const t of ATTRIBUTION_TABS.slice(1)) {
    out.push({ href: t.href, label: `Attribution · ${t.label}`, group: "Analyze", keywords: `attribution ${t.label.toLowerCase()}` });
  }
  return out;
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const all = useMemo(entries, []);
  const q = query.trim().toLowerCase();
  const matches = q === "" ? all : all.filter((e) => e.keywords.includes(q) || e.group.toLowerCase().includes(q));

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  // Global shortcut. Ignores the event when a dialog is already open so ⌘K
  // inside a drawer doesn't stack surfaces.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(href: string) {
    const qs = searchParams.toString();
    close();
    router.push(qs ? `${href}?${qs}` : href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = matches[active];
      if (hit) go(hit.href);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Jump to screen"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === dialogRef.current) close(); }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-app-scrim"
    >
      <div className="mx-auto mt-[12vh] w-[520px] max-w-[calc(100vw-32px)] overflow-hidden rounded-lg border border-app-border bg-app-card shadow-app-pop motion-safe:animate-[pop-in_140ms_var(--easing-out)] motion-reduce:animate-none">
        <div className="flex items-center gap-2.5 border-b border-app-border px-4 py-3">
          <Icon name="search" size={15} className="flex-none text-content-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to…"
            aria-label="Jump to screen"
            className="w-full border-0 bg-transparent font-sans text-ops-body text-content outline-none placeholder:text-content-subtle"
          />
          <kbd className="flex-none rounded-md border border-app-border bg-app-well px-1.5 py-0.5 font-sans text-ops-micro font-semibold text-content-subtle">
            esc
          </kbd>
        </div>

        <ul ref={listRef} role="listbox" aria-label="Screens" className="m-0 max-h-[320px] list-none overflow-y-auto p-1.5">
          {matches.length === 0 && (
            <li className="px-3 py-6 text-center font-sans text-ops-body text-content-subtle">
              Nothing matches &ldquo;{query}&rdquo;
            </li>
          )}
          {matches.map((e, i) => {
            const current = e.href === pathname;
            return (
              <li key={e.href} role="option" aria-selected={i === active} data-index={i}>
                <button
                  type="button"
                  onClick={() => go(e.href)}
                  onMouseMove={() => setActive(i)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md border-0 px-2.5 py-2 text-left font-sans text-ops-body transition-colors duration-fast ease-out ${
                    i === active ? "bg-app-well text-content" : "bg-transparent text-content-muted"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  {current && <span className="flex-none font-sans text-ops-micro text-content-subtle">current</span>}
                  <span className="flex-none font-sans text-ops-micro uppercase text-content-subtle">{e.group}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
