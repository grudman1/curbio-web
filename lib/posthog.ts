"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PostHog — product analytics, alongside GA4 (which stays).
//
// CONSENT: PostHog is gated exactly like Microsoft Clarity, NOT like GA4.
//
//   GA4      uses Google Consent Mode v2: it always loads and runs
//            cookieless/pinged when consent is denied.
//   Clarity  has no consent-mode equivalent, so the only way to honour a
//            decline is to never inject it.
//   PostHog  likewise. It is not initialised until analytics consent is true,
//            and opts out of capturing if consent is later revoked.
//
// The consent decision itself comes from lib/consent.ts and nowhere else —
// that module already encodes the full priority chain (GPC signal → CookieYes
// decision cookie → CONSENT_DEFAULT). This file does not read document.cookie,
// does not look at navigator.globalPrivacyControl, and does not have its own
// notion of a default. CONSENT_DEFAULT is owned by legal and is not referenced
// here at all.
//
// ATTRIBUTION: super properties are read from lib/analytics.ts — the same
// sessionStorage UTMs, the same write-once localStorage first-touch, and the
// same closed nine-value channel derivation the lead payload uses. Nothing is
// re-captured or re-derived here; a second attribution implementation would
// drift from the one the CRM actually receives.
// ─────────────────────────────────────────────────────────────────────────────

import type { PostHog } from "posthog-js";
import { deriveChannel } from "./channels";
import { getFirstTouch, getStoredUtms } from "./analytics";
import { getConsentState } from "./consent";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let client: PostHog | null = null;
// The in-flight load, NOT a boolean. Concurrent callers must AWAIT the same
// load rather than returning early: the provider calls initPostHog() from two
// effects on mount, and a boolean guard made the second call resolve
// immediately while `client` was still null — so the pageview capture that
// followed it silently no-opped. PostHog looked fully wired and reported zero
// pageviews. Caught only by inspecting real captured payloads.
let initPromise: Promise<void> | null = null;

/** Configured at all? Absent key = every function here is a no-op, in every
 *  environment, with no crash and no console noise. */
export function posthogConfigured(): boolean {
  return typeof window !== "undefined" && !!POSTHOG_KEY;
}

/** The live client, or null when unconfigured / not yet consented. */
export function getPostHog(): PostHog | null {
  return client;
}

/**
 * Attribution attached to EVERY event.
 *
 * Recomputed on each call rather than cached: first-touch can be written
 * mid-session (on the visitor's first UTM-carrying arrival), and the campaign
 * pages strip the URL on mount, so a value captured once at init would be
 * wrong for every event after it.
 */
function superProperties(): Record<string, string | null> {
  const utms = getStoredUtms();
  const firstTouch = getFirstTouch();
  return {
    channel: deriveChannel(utms.utm_source),
    utm_source: utms.utm_source ?? null,
    utm_medium: utms.utm_medium ?? null,
    utm_campaign: utms.utm_campaign ?? null,
    utm_content: utms.utm_content ?? null,
    utm_term: utms.utm_term ?? null,
    first_touch_channel: firstTouch?.channel ?? null,
    first_touch_campaign: firstTouch?.campaign ?? null,
  };
}

/**
 * Initialise once, only with analytics consent. Safe to call repeatedly —
 * mount, consent change, and route change all call it.
 */
export async function initPostHog(): Promise<void> {
  if (!posthogConfigured()) return;
  if (client) {
    // Already up: refresh super properties in case first-touch landed after
    // init, then return.
    client.register(superProperties());
    return;
  }
  if (initPromise) return initPromise; // load in flight — await it, don't skip
  if (!getConsentState().analytics) return;

  initPromise = (async () => {
    const { default: posthog } = await import("posthog-js");
    posthog.init(POSTHOG_KEY as string, {
      api_host: POSTHOG_HOST,
      // Pageviews are captured manually on route change — the App Router does
      // not fire them for client-side navigations, and PostHog's automatic
      // capture only fires on hard loads.
      capture_pageview: false,
      capture_pageleave: true,
      // No autocapture: this app's funnel is explicitly instrumented, and
      // autocapture on a lead form risks hoovering up field-level PII.
      autocapture: false,
      // Never record form input values. The form collects name, email, phone
      // and address; none of it may reach an analytics vendor.
      mask_all_element_attributes: true,
      mask_all_text: true,
    });
    client = posthog;
    posthog.register(superProperties());
  })().catch(() => {
    // Analytics must never break a page, let alone a lead form. Reset so a
    // later consent change can retry rather than being stuck on a dead promise.
    client = null;
    initPromise = null;
  });

  return initPromise;
}

/** Stop capturing when consent is withdrawn mid-session. */
export function optOutPostHog(): void {
  try {
    client?.opt_out_capturing();
  } catch {
    /* no-op */
  }
}

/** Capture an event with current attribution attached. No-op without consent. */
export function posthogCapture(name: string, params: Record<string, unknown> = {}): void {
  if (!client) return;
  try {
    client.capture(name, { ...superProperties(), ...params });
  } catch {
    /* analytics must never throw into the caller */
  }
}
