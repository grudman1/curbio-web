"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { onConsentChange } from "@/lib/consent";
import { initPostHog, optOutPostHog, posthogCapture, posthogConfigured } from "@/lib/posthog";

/**
 * Mounts PostHog in the root layout so no page ever needs retrofitting.
 *
 * The SUSPENSE BOUNDARY IS LOAD-BEARING. useSearchParams() below opts its
 * subtree out of static prerendering; without a boundary that bubbles up and
 * flips `/`, `/exp` and every per-market page from prerendered-at-the-edge to
 * rendered-per-request, which would trade the site's entire TTFB architecture
 * for an analytics detail. With the boundary, the static shell is preserved
 * and only this (null-rendering) component defers to the client. Verified in
 * the build output — those routes must stay ○ / ●, never ƒ.
 *
 * Why searchParams are needed at all: this app switches markets with
 * `?market=<slug>` ON THE SAME PATH. Keying pageviews off pathname alone
 * meant every market switch and every ?zip= lookup was invisible — confirmed
 * by capturing real payloads, where a ?zip= navigation produced no $pageview.
 */
export function PostHogProvider() {
  return (
    <Suspense fallback={null}>
      <PostHogTracker />
    </Suspense>
  );
}

function PostHogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Guards against a double $pageview on mount, where the pathname effect and
  // the init effect would otherwise both fire for the same URL.
  const lastCaptured = useRef<string | null>(null);

  // Init + consent lifecycle.
  useEffect(() => {
    if (!posthogConfigured()) return;
    void initPostHog();
    return onConsentChange((state) => {
      if (state.analytics) {
        // Consent granted mid-session (banner accept) — start now.
        void initPostHog();
      } else {
        optOutPostHog();
      }
    });
  }, []);

  // Manual pageview on every route change. The App Router does not fire these
  // for client-side navigations, so without this a visitor's whole journey
  // after the first load is invisible.
  useEffect(() => {
    if (!posthogConfigured()) return;
    const url = window.location.href;
    if (lastCaptured.current === url) return;

    // Ignore the app's own URL SCRUBS, which are replaceState calls rather
    // than navigations and would otherwise double-count every campaign
    // landing. Two exist: the landing pages strip all query params on mount
    // for a clean address bar (see captureAttribution), and ConfirmShell
    // scrubs prefill params. Both look identical from here — same pathname,
    // query goes from populated to empty — so that is exactly what is
    // filtered. A real navigation to the bare path after a query one is
    // under-counted by one; double-counting every single campaign arrival
    // would be far worse.
    const prev = lastCaptured.current;
    if (prev) {
      const before = new URL(prev);
      const now = new URL(url);
      const isScrub =
        before.pathname === now.pathname && before.search !== "" && now.search === "";
      if (isScrub) {
        lastCaptured.current = url;
        return;
      }
    }

    lastCaptured.current = url;

    // PostHog's built-in pageview, session and path analytics are all keyed on
    // "$pageview". Emitting a custom "page_view" here instead would leave the
    // PostHog project reporting zero pageviews while looking instrumented.
    // GA4 keeps its own separate manual "page_view" — see lib/analytics.ts.
    void initPostHog().then(() => {
      posthogCapture("$pageview", {
        $current_url: url,
        pathname,
      });
    });
  }, [pathname, searchParams]);

  return null;
}
