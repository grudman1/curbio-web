"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GA4 instrumentation + campaign attribution that survives the clean-URL strip.
//
// The landing page strips ALL query params on mount (clean URL in the address
// bar). Attribution therefore CANNOT rely on GA4 reading window.location —
// gtag.js may load seconds later on a slow connection, long after the strip.
//
// Instead, captureAttribution() runs synchronously BEFORE the strip:
//   1. read utm_* from window.location.search
//   2. persist them to sessionStorage (later events + /confirm attach them)
//   3. queue a manual page_view on the dataLayer with explicit campaign params
// gtag.js drains the dataLayer queue whenever it finishes loading, so the
// captured params win regardless of script timing.
//
// PII rule: name/email/phone must NEVER be sent to GA4 — only UTMs, market,
// variant, and the GA client id.
// ─────────────────────────────────────────────────────────────────────────────

import { deriveChannel } from "./channels";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type Utms = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_KEY = "curbio_utms";

// First-touch attribution — separate from the sessionStorage UTMs above,
// which are deliberately last-touch. Written ONCE on the visitor's first
// arrival carrying UTMs and never overwritten, so a visitor who first came
// from an email and later returns via a partner link still reports
// firstTouchChannel: "email". localStorage so it survives the session;
// ~90-day expiry enforced on read (localStorage has no TTL of its own).
const FIRST_TOUCH_KEY = "curbio_first_touch";
const FIRST_TOUCH_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type FirstTouch = { channel: string; campaign: string | null; ts: number };

/** First-touch attribution captured on the visitor's first UTM-carrying
 *  arrival. Null when never captured, expired (>90d), or storage unavailable. */
export function getFirstTouch(): FirstTouch | null {
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    if (!raw) return null;
    const ft = JSON.parse(raw) as FirstTouch;
    if (typeof ft?.ts !== "number" || Date.now() - ft.ts > FIRST_TOUCH_TTL_MS) {
      localStorage.removeItem(FIRST_TOUCH_KEY);
      return null;
    }
    return ft;
  } catch {
    return null;
  }
}

// GA4 only runs in production builds with a measurement ID configured;
// everything no-ops cleanly in dev/preview when the ID is absent.
function gaEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    process.env.NODE_ENV === "production" &&
    !!GA_ID
  );
}

/* eslint-disable prefer-rest-params, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// gtag.js requires the literal `arguments` object on the dataLayer (an array
// does not work) — hence a `function` declaration, not an arrow. `_args`
// exists only to give the signature an arity; `arguments` is what's pushed.
function gtag(..._args: any[]) {
  (window as any).dataLayer.push(arguments);
}
/* eslint-enable prefer-rest-params, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

// Idempotent gtag bootstrap: stub the dataLayer and send the config exactly
// once per page. send_page_view is DISABLED — page_view is sent manually with
// explicit campaign params (see captureAttribution).
function ensureGa(): boolean {
  if (!gaEnabled()) return false;
  const w = window as unknown as { dataLayer?: unknown[]; __curbioGaInit?: boolean };
  w.dataLayer = w.dataLayer || [];
  if (!w.__curbioGaInit) {
    w.__curbioGaInit = true;
    gtag("js", new Date());
    gtag("config", GA_ID, { send_page_view: false });
  }
  return true;
}

/** UTMs captured on landing, for attaching to later funnel events. */
export function getStoredUtms(): Utms {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Utms) : {};
  } catch {
    return {};
  }
}

/**
 * Step 1 of the landing-page mount sequence. Synchronous — the caller runs the
 * URL strip immediately after this returns, so everything here must read
 * window.location.search NOW.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;

  // 1. Read utm_* from the live URL (before the strip wipes it).
  const params = new URLSearchParams(window.location.search);
  const utms: Utms = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) utms[k] = v;
  }

  // 2. Persist for later events (lead_submit, booking_view, booking_complete)
  //    and for the /confirm page after navigation. Only overwrite when this
  //    load actually carried UTMs, so an internal nav doesn't erase them.
  try {
    if (Object.keys(utms).length) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utms));
    }
  } catch {
    // sessionStorage unavailable (private mode) — events just go un-attributed.
  }

  // 2b. First-touch capture: write-once, only on a UTM-carrying arrival.
  //     getFirstTouch() returning non-null means a live (unexpired) record
  //     exists — never overwrite it (that's the whole point of first-touch).
  try {
    if (Object.keys(utms).length && !getFirstTouch()) {
      const ft: FirstTouch = {
        channel: deriveChannel(utms.utm_source),
        campaign: utms.utm_campaign ?? null,
        ts: Date.now(),
      };
      localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(ft));
    }
  } catch {
    // localStorage unavailable — leads just go without first-touch fields.
  }

  // 3. Queue the manual page_view with explicit campaign params. Queued on the
  //    dataLayer stub, so it is delivered even if gtag.js loads much later.
  if (ensureGa()) {
    const stored = getStoredUtms();
    gtag("event", "page_view", {
      page_location: window.location.href, // full URL incl. params, pre-strip
      page_path: window.location.pathname,
      campaign_source: utms.utm_source ?? stored.utm_source,
      campaign_medium: utms.utm_medium ?? stored.utm_medium,
      campaign_name: utms.utm_campaign ?? stored.utm_campaign,
      campaign_content: utms.utm_content ?? stored.utm_content,
      campaign_term: utms.utm_term ?? stored.utm_term,
      ...utms,
    });
  }
}

/** Send a GA4 funnel event with stored UTMs attached. No PII allowed here. */
export function gaEvent(
  name: string,
  params: Record<string, string | null | undefined> = {}
): void {
  if (!ensureGa()) return;
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...getStoredUtms(), ...params })) {
    if (v != null && v !== "") clean[k] = v;
  }
  gtag("event", name, clean);
}

/**
 * GA4 client_id for the CRM join key (lead → closed-job reporting later).
 * Resolves null after `timeoutMs` so a missing/blocked GA4 never delays the
 * lead POST. The gtag 'get' callback fires once gtag.js processes the queue.
 */
export function getGaClientId(timeoutMs = 1200): Promise<string | null> {
  if (!ensureGa()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    try {
      gtag("get", GA_ID, "client_id", (cid: unknown) => {
        clearTimeout(timer);
        resolve(typeof cid === "string" ? cid : null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
