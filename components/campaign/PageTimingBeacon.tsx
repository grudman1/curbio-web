"use client";

import { useEffect } from "react";
import { initPostHog, posthogCapture, posthogConfigured } from "@/lib/posthog";

// ─────────────────────────────────────────────────────────────────────────────
// Per-visit load timing + bot signals for the campaign landing pages → PostHog.
//
// WHY: Speed Insights shows P75 TTFB of 14s on "/" on send days while the page
// itself is a CDN hit answering in ~0.2s. Speed Insights can't say where the
// time went or who the visitor was. This event splits the browser's own
// timeline into:
//
//   before_request_ms  click → our origin contacted. Cross-origin redirects
//                      (email click trackers, link scanners like EdgePilot /
//                      Safe Links) land here, and nowhere else.
//   server_ms          request sent → first byte back (our side).
//   render_ms          first byte → first contentful paint (front end).
//
// …and records what each visitor looks like, so scanner sandboxes can be told
// apart from agents. Two events, deliberately:
//
//   page_timing             once per load: on pagehide, or 10s after load,
//                           whichever comes first.
//   page_first_interaction  once, on the first mouse/scroll/key/touch. Its
//                           ABSENCE for a load is the "nobody was there"
//                           signal — a scanner never sends it.
//
// Consent-gated like every other PostHog event (lib/posthog.ts). No PII:
// referrer is host only, because email link wrappers put the recipient's
// address and the target URL in the query string.
// ─────────────────────────────────────────────────────────────────────────────

const SEND_AFTER_LOAD_MS = 10_000;

// Hard signals only — any one of these means automation, not a person.
// Vendor names are what scanners send when they identify themselves; most
// spoof a normal Chrome UA, which is what the behavioural fields are for.
const AUTOMATION_UA =
  /headlesschrome|phantomjs|puppeteer|playwright|selenium|bot\b|crawler|spider|mimecast|proofpoint|barracuda|safelinks|edgepilot|urldefense|appriver|ironport|zscaler|forcepoint|trendmicro|symantec|sophos|fireeye/i;

const ms = (n: number | undefined) => (typeof n === "number" && n > 0 ? Math.round(n) : 0);

function botSignals() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ua = nav.userAgent || "";
  const signals: string[] = [];
  if (nav.webdriver) signals.push("webdriver");
  if (/headlesschrome/i.test(ua)) signals.push("ua_headless");
  else if (AUTOMATION_UA.test(ua)) signals.push("ua_automation");
  if (window.outerWidth === 0 || window.outerHeight === 0) signals.push("zero_window");
  if (!nav.languages || nav.languages.length === 0) signals.push("no_languages");
  return {
    bot_signals: signals,
    likely_bot: signals.length > 0,
    user_agent: ua,
    // Soft signals: recorded, never scored here. Sandboxes skew to small VMs
    // and default screen sizes; worth a look in aggregate, not per visit.
    screen: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    hardware_concurrency: nav.hardwareConcurrency ?? null,
    device_memory: nav.deviceMemory ?? null,
    plugins_count: nav.plugins?.length ?? null,
  };
}

function referrerHost(): string | null {
  try {
    return document.referrer ? new URL(document.referrer).hostname : null;
  } catch {
    return null;
  }
}

export default function PageTimingBeacon() {
  useEffect(() => {
    if (!posthogConfigured() || typeof performance === "undefined") return;

    const t0 = performance.now();
    const hiddenAtStart = document.visibilityState === "hidden";
    let firstInteractionMs: number | null = null;
    let lcp = 0;
    let sent = false;

    let lcpObserver: PerformanceObserver | undefined;
    try {
      lcpObserver = new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) lcp = last.startTime;
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* LCP unsupported (Safari < 17.4 / Firefox) — field stays 0 */
    }

    const INTERACTIONS = ["pointermove", "pointerdown", "scroll", "wheel", "keydown", "touchstart"] as const;
    const onInteract = () => {
      if (firstInteractionMs !== null) return;
      firstInteractionMs = Math.round(performance.now());
      for (const e of INTERACTIONS) window.removeEventListener(e, onInteract, true);
      void initPostHog().then(() =>
        posthogCapture("page_first_interaction", {
          pathname: location.pathname,
          ms_since_navigation: firstInteractionMs,
        })
      );
    };
    for (const e of INTERACTIONS) window.addEventListener(e, onInteract, { capture: true, passive: true });

    const send = (trigger: "timer" | "pagehide") => {
      if (sent) return;
      sent = true;
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
      const activation = (nav as PerformanceNavigationTiming & { activationStart?: number })?.activationStart ?? 0;
      const redirect = nav ? nav.redirectEnd - nav.redirectStart : 0;

      const props = {
        pathname: location.pathname,
        trigger,
        // ── where the time went ──
        ttfb_ms: nav ? ms(nav.responseStart - activation) : null,
        before_request_ms: nav ? ms(nav.fetchStart - activation) : null,
        same_origin_redirect_ms: ms(redirect),
        dns_ms: nav ? ms(nav.domainLookupEnd - nav.domainLookupStart) : null,
        connect_ms: nav ? ms(nav.connectEnd - nav.connectStart) : null,
        server_ms: nav ? ms(nav.responseStart - nav.requestStart) : null,
        download_ms: nav ? ms(nav.responseEnd - nav.responseStart) : null,
        fcp_ms: ms(fcp - activation),
        lcp_ms: ms(lcp - activation),
        render_ms: nav && fcp ? ms(fcp - nav.responseStart) : null,
        dom_content_loaded_ms: nav ? ms(nav.domContentLoadedEventEnd) : null,
        load_ms: nav ? ms(nav.loadEventEnd) : null,
        // ── how the page was reached ──
        nav_type: nav?.type ?? null,
        redirect_count: nav?.redirectCount ?? null,
        transfer_size: nav?.transferSize ?? null,
        protocol: nav?.nextHopProtocol ?? null,
        prerendered: activation > 0,
        hidden_at_start: hiddenAtStart,
        referrer_host: referrerHost(),
        // ── who it looks like ──
        interacted: firstInteractionMs !== null,
        ms_to_first_interaction: firstInteractionMs,
        time_on_page_ms: Math.round(performance.now() - t0),
        ...botSignals(),
      };
      void initPostHog().then(() =>
        posthogCapture("page_timing", props, trigger === "pagehide" ? { transport: "sendBeacon" } : undefined)
      );
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const armTimer = () => {
      timer = setTimeout(() => send("timer"), SEND_AFTER_LOAD_MS);
    };
    if (document.readyState === "complete") armTimer();
    else window.addEventListener("load", armTimer, { once: true });

    const onHide = () => {
      if (document.visibilityState === "hidden") send("pagehide");
    };
    const onPageHide = () => send("pagehide");
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearTimeout(timer);
      lcpObserver?.disconnect();
      window.removeEventListener("load", armTimer);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onHide);
      for (const e of INTERACTIONS) window.removeEventListener(e, onInteract, true);
    };
  }, []);

  return null;
}
