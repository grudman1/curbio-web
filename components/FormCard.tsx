"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { captureAttribution, getFirstTouch, getGaClientId, getStoredUtms } from "@/lib/analytics";
import { trackEvent } from "@/lib/events";
import { deriveChannel } from "@/lib/channels";
import { campaignBaseFor, campaignHref } from "@/lib/campaignBase";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CtaVariant } from "@/lib/ctaVariant";

/**
 * Agent-facing ZIP label — the historical wording, kept as the default so
 * every page that does not override it (/exp, /lp/sell) is unchanged. Consumer
 * pages pass their own via the campaign config's `zipLabel`.
 */
const DEFAULT_ZIP_LABEL = "Property or Agent ZIP Code";

/**
 * Agent-facing email placeholder — same story as the ZIP label above.
 * "you@brokerage.com" is right on an agent page and wrong on a homeowner one.
 * Kept as the default so /exp and /lp/sell are unchanged.
 */
const DEFAULT_EMAIL_PLACEHOLDER = "you@brokerage.com";

export function FormCard({
  market,
  crmMarketName = null,
  variant,
  ctaCopy,
  prefillName = "",
  prefillEmail = "",
  referralSourceId,
  source,
  showZip = false,
  zipLabel = DEFAULT_ZIP_LABEL,
  emailPlaceholder = DEFAULT_EMAIL_PLACEHOLDER,
  showAddress = false,
  partnerSlug,
  defaultUtmSource,
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  variant: CtaVariant;
  ctaCopy: string;
  prefillName?: string;
  prefillEmail?: string;
  /** Default referralSourceId for this page. Overridden by ?referral_source_id= URL param if present. */
  referralSourceId?: string;
  /** Override the lead source string. Defaults to "email-campaign-<market-slug>". */
  source?: string;
  /** Show a ZIP code field. */
  showZip?: boolean;
  /** Label for that field. Copy — agent-facing by default, see the constant. */
  zipLabel?: string;
  /** Email field placeholder. Copy — agent-facing by default. */
  emailPlaceholder?: string;
  /** Show an optional address field labeled "Property Street Address." */
  showAddress?: boolean;
  /** Partner slug to carry through to the confirm page (e.g. "exp"). */
  partnerSlug?: string;
  /** Page-level FALLBACK utm_source. Never overrides a real one — see below. */
  defaultUtmSource?: string;
}) {
  const [f, setF] = useState({ name: prefillName, email: prefillEmail, phone: "", zip: "", address: "" });
  // Which fields were prefilled (via props, or via ?n=/?e= read on mount) —
  // drives the amber "prefilled" border until the visitor edits the field.
  const [prefilled, setPrefilled] = useState({ name: !!prefillName, email: !!prefillEmail });
  const [nameEdited, setNameEdited] = useState(false);
  const [emailEdited, setEmailEdited] = useState(false);
  const [errs, setErrs] = useState<{ name?: string; email?: string; server?: string }>({});
  const [pending, setPending] = useState(false);
  const router = useRouter();

  // Spam time-trap: when this form became interactive. Sent as `renderedAt`
  // so the route can discard sub-2-second (bot-speed) submissions. Set on
  // mount (client clock) — the route compares it against the client-clock
  // submittedAt, never against the server clock, so skew can't eat real leads.
  const renderedAtRef = useRef(0);

  // form_start fires once per mount, on the first focus of any field.
  const formStartFired = useRef(false);
  const onFormFocus = useCallback(() => {
    if (formStartFired.current) return;
    formStartFired.current = true;
    trackEvent("form_start", { form_id: "quote-form", market: market.slug || "unknown", variant });
  }, [market.slug, variant]);

  // Holds the resolved referral source ID: URL param wins over prop default.
  // Initialized from prop so /exp attribution survives URL strips on returning visitors.
  const refIdRef = useRef<string | undefined>(referralSourceId);

  useEffect(() => {
    renderedAtRef.current = Date.now();
    // ORDER IS LOAD-BEARING: captureAttribution() reads utm_* from the live
    // URL, persists them, and queues the GA4 page_view — all synchronously —
    // BEFORE the strip below wipes the query string for the clean URL.
    captureAttribution();
    // Capture referral_source_id now, before the strip erases it.
    // URL param takes precedence over the prop default (e.g. ?referral_source_id=eXp%20realty).
    const params = new URLSearchParams(window.location.search);
    const urlRefId = params.get("referral_source_id");
    if (urlRefId) refIdRef.current = urlRefId;
    // Prefill (?n= / ?e=) is read client-side, before the strip below — the
    // page is prerendered (one HTML for all visitors), so the server can no
    // longer inject per-visitor values. Never overwrite anything already set.
    const urlName = (params.get("n") ?? "").trim();
    const urlEmail = (params.get("e") ?? "").trim();
    if (urlName || urlEmail) {
      setF((s) => ({
        ...s,
        name: s.name || urlName,
        email: s.email || urlEmail,
      }));
      setPrefilled((p) => ({ name: p.name || !!urlName, email: p.email || !!urlEmail }));
    }
    // Keep ?market= so a browser refresh re-resolves the correct market via the
    // server (geo would otherwise win on reload). Strip everything else: PII
    // (n, e), utm_* already captured above, and any other params.
    const marketSlug = params.get("market");
    const cleanUrl = marketSlug
      ? `${window.location.pathname}?market=${encodeURIComponent(marketSlug)}`
      : window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);
  }, []);

  const onChange = useCallback(
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setF((s) => ({ ...s, [k]: e.target.value }));
      setErrs((p) => ({ ...p, [k]: undefined }));
      if (k === "name") setNameEdited(true);
      if (k === "email") setEmailEdited(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (pending) return;

      // 1. Validate synchronously before any await
      const next: { name?: string; email?: string } = {};
      if (!f.name.trim()) next.name = "Please enter your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
        next.email = "Please enter a valid email address.";
      if (next.name || next.email) {
        setErrs(next);
        return;
      }

      // 2. Optimistic UI update — synchronous, before any await
      setPending(true);
      setErrs({});

      const full = f.name.trim();
      // Page-level FALLBACK utm_source, applied HERE and nowhere else.
      //
      // Two rules make this a default rather than an override, and both are
      // load-bearing:
      //
      //   1. Blank counts as absent. `?utm_source=` yields "", which is falsy
      //      but NOT nullish — a bare `??` would keep the empty string and
      //      skip the default, while deriveChannel("") returns "direct". Hence
      //      the trim check instead of `??`.
      //
      //   2. NEVER persist it. getStoredUtms() reads sessionStorage, which is
      //      last-touch and session-WIDE, and captureAttribution() writes a
      //      90-day first-touch record to localStorage. Writing the default
      //      into either would leak this page's channel onto every later page
      //      in the session, and could stamp a 90-day first-touch of
      //      "partnership" on a visitor whose real first touch was organic.
      //      Applying it at send time only leaves both stores untouched.
      //
      // Consequence, accepted deliberately: a visitor who already picked up a
      // real utm_source earlier in the session (say paid_search) keeps it, so
      // this does NOT tag all partner traffic. Undercounting the partner beats
      // overwriting genuine attribution.
      const stored = getStoredUtms();
      const utms =
        stored.utm_source?.trim()
          ? stored
          : { ...stored, ...(defaultUtmSource ? { utm_source: defaultUtmSource } : {}) };
      // Closed-list channel from the shared taxonomy — "direct" when utm_source
      // is absent or unrecognized (never null, never a phantom channel). Derived
      // from the SAME `utms` that goes into the payload below, so the GA event
      // and the server-stored lead can never disagree about the channel.
      const derivedChannel = deriveChannel(utms.utm_source);
      const firstTouch = getFirstTouch();

      try {
        // 3. Resolve GA client ID and POST in parallel so neither blocks the other
        const [gaClientId, res] = await Promise.all([
          getGaClientId(),
          fetch("/api/lead", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: full,
              email: f.email.trim(),
              phone: f.phone.trim() || undefined,
              source: source ?? `email-campaign-${market.slug || "unknown"}`,
              market: market.slug || null,
              crmMarketName: crmMarketName ?? null,
              variant,
              submittedAt: new Date().toISOString(),
              referralSourceId: refIdRef.current,
              // Attribution model (Curbio Attribution System spec): channel is
              // derived server-side from utm_source; these travel alongside.
              entryPoint: "web_form",
              medium: utms.utm_medium ?? null,
              firstTouchChannel: firstTouch?.channel ?? null,
              firstTouchCampaign: firstTouch?.campaign ?? null,
              // Spam tripwire — see the lead route.
              renderedAt: renderedAtRef.current,
              ...(f.zip && { zip: f.zip.replace(/\D/g, "").slice(0, 5) }),
              ...(f.address.trim() && { address: f.address.trim() }),
              ...utms,
            }),
          }),
        ]);

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");

        // 4. Analytics off the critical path — yield to the browser first
        setTimeout(() => {
          track("lead_submit", { variant });
          trackEvent("lead_submit", {
            market: market.slug || "unknown",
            variant,
            ga_client_id: gaClientId ?? undefined,
            channel: derivedChannel,
            referral_source_id: refIdRef.current,
          });
        }, 0);

        // 5. Navigate immediately after successful POST. PII travels to
        // /confirm in a short-lived, path-scoped cookie — NEVER in the URL,
        // which would land in browser history, Vercel request logs, and
        // Clarity session metadata (input masking doesn't cover URLs).
        // /confirm reads it server-side so the Calendly iframe src is still
        // prefilled in the first SSR HTML, then expires it on mount.
        const prefillJson = JSON.stringify({
          name: f.name.trim(),
          email: f.email.trim(),
          ...(f.phone.trim() && { phone: f.phone.trim() }),
        });
        document.cookie =
          `curbio_confirm_prefill=${encodeURIComponent(prefillJson)}; path=/confirm; max-age=120; samesite=lax`;
        const qs = new URLSearchParams();
        if (market.slug) qs.set("market", market.slug);
        if (partnerSlug) qs.set("partner", partnerSlug);
        // Resolved at navigation time, not render time: on sell.curbio.com the
        // pathname is "/" and this yields "/confirm" exactly as before, while
        // the QA shape (/lp/sell) keeps the visitor inside the campaign tier
        // instead of escaping into the site group. See lib/campaignBase.ts.
        const confirmPath = campaignHref(campaignBaseFor(window.location.pathname), "/confirm");
        router.push(`${confirmPath}${qs.size ? `?${qs.toString()}` : ""}`);
      } catch (err) {
        setErrs({ server: err instanceof Error ? err.message : "Something went wrong." });
      } finally {
        setPending(false);
      }
    },
    [pending, f, market, crmMarketName, variant, source, partnerSlug, router]
  );

  return (
    <form className="lp-fc" id="quote-form" onSubmit={submit} onFocusCapture={onFormFocus} noValidate>
      <div className="lp-fc-field">
        <label className="lp-fc-label" htmlFor="fc-name">Name</label>
        <input
          id="fc-name"
          className={"lp-input" + (errs.name ? " lp-input-err" : prefilled.name && !nameEdited ? " lp-input-prefilled" : "")}
          type="text"
          value={f.name}
          onChange={onChange("name")}
          placeholder="Your name"
          autoComplete="name"
          aria-invalid={!!errs.name}
          aria-describedby={errs.name ? "fc-name-err" : undefined}
        />
        {errs.name && <span id="fc-name-err" className="lp-fc-err" role="alert">{errs.name}</span>}
      </div>

      <div className="lp-fc-field">
        <label className="lp-fc-label" htmlFor="fc-email">Email</label>
        <input
          id="fc-email"
          className={"lp-input" + (errs.email ? " lp-input-err" : prefilled.email && !emailEdited ? " lp-input-prefilled" : "")}
          type="email"
          value={f.email}
          onChange={onChange("email")}
          placeholder={emailPlaceholder}
          autoComplete="email"
          aria-invalid={!!errs.email}
          aria-describedby={errs.email ? "fc-email-err" : undefined}
        />
        {errs.email && <span id="fc-email-err" className="lp-fc-err" role="alert">{errs.email}</span>}
      </div>

      <div className="lp-fc-field">
        <label className="lp-fc-label" htmlFor="fc-phone">
          Phone <span className="lp-fc-optional">(optional)</span>
        </label>
        <input
          id="fc-phone"
          className="lp-input"
          type="tel"
          inputMode="tel"
          value={f.phone}
          onChange={onChange("phone")}
          placeholder="(555) 555-5555"
          autoComplete="tel"
        />
      </div>

      {showZip && (
        <div className="lp-fc-field">
          <label className="lp-fc-label" htmlFor="fc-zip">{zipLabel}</label>
          <input
            id="fc-zip"
            className="lp-input"
            type="text"
            inputMode="numeric"
            value={f.zip}
            onChange={onChange("zip")}
            placeholder="ZIP code"
            autoComplete="postal-code"
            maxLength={10}
          />
        </div>
      )}

      {showAddress && (
        <div className="lp-fc-field">
          <label className="lp-fc-label" htmlFor="fc-address">
            Property Street Address <span className="lp-fc-optional">(optional)</span>
          </label>
          <input
            id="fc-address"
            className="lp-input"
            type="text"
            value={f.address}
            onChange={onChange("address")}
            placeholder="123 Main St"
            autoComplete="street-address"
          />
        </div>
      )}

      {errs.server && <p className="lp-fc-server" role="alert">{errs.server}</p>}

      <button className="lp-fc-submit" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? (
          <>
            <span className="lp-spinner" aria-hidden /> Sending…
          </>
        ) : (
          ctaCopy
        )}
      </button>

      <p className="lp-fc-tcpa">
        By submitting, you agree to our{" "}
        <a href="https://curbio.com/privacy-policy" target="_blank" rel="noreferrer noopener">
          Privacy Policy
        </a>
        {" "}and consent to calls and texts from Curbio. Reply STOP to opt out.
      </p>
    </form>
  );
}
