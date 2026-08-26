"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InfoPopover } from "../_ui/InfoPopover";

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
//
// PROSE BUDGET: this banner used to carry three explanatory sentences — that
// failures are persisted and recoverable, that dismissal is per-browser, that
// a read failure is not proof the pipeline is down. All three claims still
// need to be here; none of them needs to be a paragraph on a screen whose job
// is to be glanced at. They live behind the ⓘ now.
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
      className="mb-ops-gap rounded-md border border-tone-bad/40 border-l-[3px] border-l-tone-bad bg-tone-bad/[0.06] px-3.5 py-2.5 font-sans"
    >
      {storeError && (
        <div className={`flex items-center gap-1.5 text-ops-body ${visible.length ? "mb-2" : ""}`}>
          <strong className="font-bold text-tone-bad">Lead store unreadable</strong>
          <span className="min-w-0 flex-1 truncate text-content-muted">{storeError}</span>
          <InfoPopover label="What a store read failure means" align="right">
            This is an admin READ failure, not proof the pipeline is down. Leads may still be
            arriving and delivering normally. Check <code className="font-mono">/api/lead</code>{" "}
            logs before assuming anything was lost.
          </InfoPopover>
        </div>
      )}

      {visible.length > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-ops-body font-bold text-tone-bad">
              {visible.length} CRM delivery failure{visible.length > 1 ? "s" : ""} in the last 24 h
            </span>
            <InfoPopover label="What happens to a failed delivery" align="right">
              Every failure is persisted in Redis and alerted by email — recoverable, not lost.
              Dismissing hides an entry in this browser only; entries age out after 24 h.
            </InfoPopover>
            <Link
              href="/admin/leads"
              className="ml-auto flex-none text-ops-label font-bold text-content-muted no-underline hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Leads ›
            </Link>
          </div>

          <ul className="m-0 mt-1 list-none p-0">
            {visible.map((e) => (
              <li key={e.id} className="flex items-baseline gap-2 py-[1px]">
                <span className="min-w-0 flex-1 truncate text-ops-label text-content-muted">
                  <span className="tabular-nums">{e.time}</span> · {e.summary} — {e.detail}
                </span>
                <button
                  type="button"
                  onClick={() => dismiss(e.id)}
                  aria-label={`Dismiss alert: ${e.summary}`}
                  title="Dismiss (this browser only)"
                  className="flex-none cursor-pointer border-0 bg-transparent px-0.5 text-ops-label leading-none text-content-subtle hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
