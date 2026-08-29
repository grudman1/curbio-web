"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// The notification tray — CRM delivery failures and pending access requests.
//
// ── Why these moved here ───────────────────────────────────────────────────
// Both used to render as full-width banners at the top of EVERY admin screen.
// That is a permanent vertical cost for something that is empty on a healthy
// day, and it pushed the actual screen down by ~80px to say nothing. Behind
// the bell they cost zero space when there is nothing wrong, and the unread
// dot is the signal that there is.
//
// ── The dot means unread, not "exists" ─────────────────────────────────────
// Opening the tray marks what is currently in it as seen, persisted per
// browser. A failure that is still unresolved therefore stops nagging after
// you have looked at it once, but a NEW one lights the dot again. The
// alternative — a dot that stays lit until the underlying problem is fixed —
// trains people to ignore it, which is the opposite of what an alert is for.
//
// Severity is carried by the row, not by the dot: the dot only ever says
// "something arrived since you last looked".

export type OpsAlert = {
  id: string;
  kind: "error" | "warning" | "info";
  title: string;
  /** Provenance or timestamp — never an explanation of what the row means. */
  meta?: string;
  href?: string;
};

const SEEN_KEY = "admin.notifications.seen.v1";

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const TONE: Record<OpsAlert["kind"], string> = {
  error: "var(--ops-error-500)",
  warning: "var(--ops-warning-500)",
  info: "var(--ops-gray-400)",
};

export function OpsNotifications({ alerts }: { alerts: OpsAlert[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  // Click-outside and Escape close it — same interaction contract as every
  // other click-triggered overlay in this app.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = alerts.filter((a) => !seen.includes(a.id));

  function toggle() {
    setOpen((v) => {
      const next = !v;
      // Mark seen on OPEN, so the dot clears for what you are about to read
      // and stays lit for anything that arrives afterwards.
      if (next && alerts.length > 0) {
        const ids = alerts.map((a) => a.id);
        setSeen(ids);
        try {
          localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
        } catch {}
      }
      return next;
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          unread.length > 0
            ? `Notifications — ${unread.length} new`
            : "Notifications"
        }
        className="ops-icon-btn"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M10 3a4.5 4.5 0 0 0-4.5 4.5c0 3.5-1.5 4.5-1.5 4.5h12s-1.5-1-1.5-4.5A4.5 4.5 0 0 0 10 3Z" strokeLinejoin="round" />
          <path d="M8.5 15a1.75 1.75 0 0 0 3 0" strokeLinecap="round" />
        </svg>
        {unread.length > 0 && (
          <span
            className="absolute right-2 top-2 h-2 w-2 rounded-full"
            style={{ background: "var(--ops-error-500)", boxShadow: "0 0 0 2px var(--ops-surface)" }}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          className="ops-pop absolute right-0 z-overlay mt-2 w-[340px]"
          role="dialog"
          aria-label="Notifications"
        >
          <p className="ops-eyebrow px-2.5 pb-2 pt-1">Notifications</p>

          {alerts.length === 0 ? (
            <p className="px-2.5 pb-2 pt-1 text-[14px]" style={{ color: "var(--ops-text-muted)" }}>
              Nothing to report.
            </p>
          ) : (
            <ul className="m-0 max-h-[340px] list-none overflow-y-auto p-0">
              {alerts.map((a) => {
                const body = (
                  <>
                    <span
                      className="ops-dot mt-1.5"
                      style={{ background: TONE[a.kind] }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] leading-5" style={{ color: "var(--ops-text)" }}>
                        {a.title}
                      </span>
                      {a.meta && (
                        <span className="ops-subtle mt-0.5 block text-[12px] leading-[18px]">
                          {a.meta}
                        </span>
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={a.id}>
                    {a.href ? (
                      <Link href={a.href} className="ops-pop-item items-start" onClick={() => setOpen(false)}>
                        {body}
                      </Link>
                    ) : (
                      <div className="ops-pop-item items-start">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
