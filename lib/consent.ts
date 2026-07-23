// ─────────────────────────────────────────────────────────────────────────────
// Single consent authority. CookieYes (app/layout.tsx) is the banner UI and
// the cookie store — this file is the only place in the app that reads that
// cookie or the GPC signal. Nothing else should touch document.cookie for
// consent or import CookieYes internals directly.
//
// Google Consent Mode v2 has four signals; we collapse them to the two
// categories CookieYes exposes by default:
//   analytics_storage                                ← analytics
//   ad_storage / ad_user_data / ad_personalization    ← advertising
// See lib/analytics.ts for where these get pushed onto the gtag dataLayer.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-banner-interaction default for Consent Mode — used when there is no
 * GPC signal AND no CookieYes decision cookie yet (a visitor's very first
 * page view, before they've clicked anything in the banner).
 *
 * LEGAL OWNS THIS VALUE. One line, no other place in the codebase encodes it.
 *   "granted" — current setting. Matches a US state-privacy-law opt-OUT
 *               posture (CCPA/CPRA-style): tracking runs by default; an
 *               explicit decline (or a GPC signal) turns it off.
 *   "denied"  — a GDPR-style prior-consent posture: nothing runs until the
 *               visitor explicitly opts in via the banner.
 */
export const CONSENT_DEFAULT: "granted" | "denied" = "granted";

export type ConsentState = { analytics: boolean; advertising: boolean };

const COOKIE_NAME = "cookieyes-consent";
const CONSENT_EVENT = "cookieyes_consent_update";

/** Global Privacy Control — a browser/extension-level opt-out signal that
 *  legally overrides any banner state. False during SSR (no `navigator`). */
export function hasGpc(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

// CookieYes stores its decision as a comma-separated list of key:value pairs,
// e.g. "consent:yes,necessary:yes,analytics:no,advertisement:no,...".
function readCookieYesCookie(): Record<string, string> | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const raw = decodeURIComponent(match[1]);
  const out: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [k, v] = pair.split(":");
    if (k && v) out[k.trim()] = v.trim();
  }
  return out;
}

/**
 * Current consent state, resolved in priority order:
 *   1. GPC on           → both categories false, full stop. Checked first
 *      and unconditionally — even a stray "yes" in the CookieYes cookie
 *      (shouldn't happen with CookieYes's own GPC handling enabled, but this
 *      file doesn't trust a downstream dashboard misconfiguration) can't
 *      override a legal opt-out signal.
 *   2. A CookieYes decision cookie exists → read from it.
 *   3. Neither → CONSENT_DEFAULT (first visit, pre-interaction).
 */
export function getConsentState(): ConsentState {
  if (hasGpc()) return { analytics: false, advertising: false };

  const parsed = readCookieYesCookie();
  if (!parsed) {
    const fallback = CONSENT_DEFAULT === "granted";
    return { analytics: fallback, advertising: fallback };
  }
  return {
    analytics: parsed.analytics === "yes",
    advertising: parsed.advertisement === "yes",
  };
}

/**
 * Subscribe to consent changes. CookieYes fires `cookieyes_consent_update`
 * on `window` whenever the visitor interacts with the banner (accept /
 * reject / save preferences). Rather than trust that event's own payload
 * shape — undocumented and version-dependent — this re-reads the cookie
 * CookieYes has already written by the time the event fires, and hands the
 * caller a fresh ConsentState. One source of truth, no schema guessing.
 *
 * Returns an unsubscribe function.
 */
export function onConsentChange(cb: (state: ConsentState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb(getConsentState());
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
