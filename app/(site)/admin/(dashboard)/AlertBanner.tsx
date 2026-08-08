"use client";

import { useEffect, useState } from "react";
import { FAIL, MUTED } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// The alert banner: absent when healthy, unmissable when not. Sits directly
// under the Control Room header on EVERY tab (it renders from the layout).
//
// Entries are generic {id, time, summary, detail} rows so the Vercel
// deploy-health source can stack its own entries here later without another
// redesign — today the only producers are CRM delivery failures (last 24 h)
// and a lead-store read error.
//
// DISMISSAL is per-browser, in localStorage. That is deliberate, not lazy:
// this page reads Redis through the READ-ONLY token, so there is nowhere
// server-side to record "seen" without weakening that constraint. Entries
// also age out naturally — the 24 h window means last Tuesday's resolved
// failure cannot linger. Stored ids are pruned to the currently-live entries
// on every load, so the localStorage key cannot grow without bound.
//
// The store-error row is NOT dismissible: while the lead store is unreadable
// the page is blind, and a hidden blindfold is worse than an annoying one.
// ─────────────────────────────────────────────────────────────────────────────

export type AlertEntry = {
  /** Stable across reloads (leadId) — dismissal is keyed on this. */
  id: string;
  /** "07-29 14:03" — already formatted server-side. */
  time: string;
  /** One line: market · source · status. */
  summary: string;
  /** Error body / context, shown after the summary. */
  detail: string;
};

const DISMISSED_KEY = "curbio:admin:dismissed-alerts:v1";

function readDismissed(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function AlertBanner({
  entries,
  storeError,
}: {
  entries: AlertEntry[];
  storeError: string | null;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  // SSR renders every entry (a dismissed row flashing briefly on reload is
  // better than the banner depending on JS to appear at all); hydration then
  // hides what this browser has already dismissed and prunes stale ids.
  useEffect(() => {
    const live = readDismissed().filter((id) => entries.some((e) => e.id === id));
    setDismissed(live);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(live));
    } catch {
      /* private mode etc. — dismissal just won't persist */
    }
  }, [entries]);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      /* see above */
    }
  };

  const visible = entries.filter((e) => !dismissed.includes(e.id));
  if (!storeError && visible.length === 0) return null;

  return (
    <div
      role="alert"
      style={{
        background: "rgba(226,75,74,0.06)",
        border: `1px solid color-mix(in srgb, ${FAIL} 45%, transparent)`,
        borderLeft: `3px solid ${FAIL}`,
        borderRadius: "var(--radius-lg)",
        padding: "16px 20px",
        marginBottom: "var(--space-5)",
        fontFamily: "var(--font-family-sans)",
      }}
    >
      {storeError && (
        <div style={{ fontSize: "var(--text-small)", marginBottom: visible.length ? 10 : 0 }}>
          <strong style={{ color: FAIL }}>Lead store unreadable:</strong> {storeError} — this is
          an admin read failure, not proof the pipeline is down. Check /api/lead logs before
          assuming leads are lost.
        </div>
      )}

      {visible.length > 0 && (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: FAIL, marginBottom: 8 }}>
            {visible.length} CRM delivery failure{visible.length > 1 ? "s" : ""} in the last
            24 h
          </div>
          {visible.map((e) => (
            <div
              key={e.id}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                padding: "2px 0",
              }}
            >
              <span style={{ fontSize: 13, color: MUTED, flex: 1, lineHeight: 1.5 }}>
                {e.time} · {e.summary} — {e.detail}
              </span>
              <button
                type="button"
                onClick={() => dismiss(e.id)}
                aria-label={`Dismiss alert: ${e.summary}`}
                title="Dismiss (this browser only)"
                style={{
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                  color: MUTED,
                  fontSize: 14,
                  lineHeight: 1,
                  padding: "0 2px",
                }}
              >
                ×
              </button>
            </div>
          ))}
          <div style={{ fontSize: "var(--text-micro)", color: MUTED, marginTop: 6 }}>
            Every failure is persisted in Redis and alerted by email — recoverable, not lost.
            Dismissing hides an entry in this browser only; entries age out after 24 h.
          </div>
        </>
      )}
    </div>
  );
}
