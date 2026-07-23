"use client";

import { useEffect } from "react";
import { getConsentState, onConsentChange } from "@/lib/consent";

const IS_PROD = process.env.NODE_ENV === "production";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params */
// Microsoft's own install snippet, untyped by nature (it stubs `window.clarity`
// as a generic queue function before the real script loads, using the literal
// `arguments` object exactly like the gtag stub in lib/analytics.ts). Ported
// as-is from the old inline <Script> in layout.tsx — only the trigger changed.
let injected = false;
function injectClarity(id: string) {
  if (injected) return;
  injected = true;
  (function (c: any, l: Document, a: string, r: string, i: string) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = "https://www.clarity.ms/tag/" + i;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window, document, "clarity", "script", id);
}
/* eslint-enable @typescript-eslint/no-explicit-any, prefer-rest-params */

/**
 * Loads Microsoft Clarity only when analytics consent is true (which is
 * already false under a GPC signal — see lib/consent.ts). Unlike GA4, which
 * uses Google Consent Mode to stay loaded-but-cookieless when denied,
 * Clarity has no such signal: the only way to honor a decline is to never
 * inject its script.
 *
 *   - Consent already granted on mount → injects immediately (idle-deferred).
 *   - Consent granted LATER in the same session (banner accept) → injects then.
 *   - Consent revoked after injection → calls clarity('stop'); Clarity has no
 *     official "uninject" API, so this is Microsoft's documented way to halt
 *     an active session.
 *
 * Default input masking stays ON in Clarity's own dashboard config — this
 * component only controls whether the script loads at all, not what it
 * records once running (the form collects PII; it must never appear in
 * session recordings, masked or not, per the original layout.tsx comment).
 */
export default function ClarityLoader() {
  useEffect(() => {
    if (!IS_PROD || !CLARITY_ID) return;

    function maybeInject() {
      if (!getConsentState().analytics) return;
      // Idle-deferred injection — equivalent to the old <Script
      // strategy="lazyOnload">, keeps this off the paint path entirely.
      // MUST pass a timeout: requestIdleCallback with no timeout option can
      // be deferred indefinitely on a busy/backgrounded page — confirmed in
      // testing (never fired after 10+s under sustained activity) — which
      // would mean a visitor who grants consent never actually gets Clarity.
      // 2s bounds the wait while still preferring genuine idle time.
      const ric = (window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
      }).requestIdleCallback;
      const idle = ric
        ? (cb: () => void) => ric(cb, { timeout: 2000 })
        : (cb: () => void) => setTimeout(cb, 1);
      idle(() => injectClarity(CLARITY_ID as string));
    }

    maybeInject();

    return onConsentChange((state) => {
      if (state.analytics) {
        maybeInject();
      } else if (typeof (window as unknown as { clarity?: (...args: unknown[]) => void }).clarity === "function") {
        (window as unknown as { clarity: (...args: unknown[]) => void }).clarity("stop");
      }
    });
  }, []);

  return null;
}
