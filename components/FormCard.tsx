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
import { readMarketPick } from "@/lib/marketPick";
import { MARKETS } from "@/config/markets";

/** The dropdown's last option — the visitor's market is not one of ours. */
const NOT_LISTED = "not-listed";

// Alphabetical with the service area, like /expcon's entry form: a list
// someone scans for their own city.
const MARKET_OPTIONS = [...MARKETS]
  .sort((a, b) => a.displayName.localeCompare(b.displayName))
  .map((m) => ({ slug: m.slug, label: `${m.displayName} — ${m.coverage}` }));

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
  prefillZip = "",
  prefillAddress = "",
  locationLabel,
  consumeMarketPrefill = false,
  referralSourceId,
  source,
  showZip = false,
  zipLabel = DEFAULT_ZIP_LABEL,
  emailPlaceholder = DEFAULT_EMAIL_PLACEHOLDER,
  showAddress = false,
  partnerSlug,
  defaultUtmSource,
  marketSource = null,
  marketChoice = false,
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  variant: CtaVariant;
  ctaCopy: string;
  prefillName?: string;
  prefillEmail?: string;
  /** Private homepage handoff. These initialise existing payload fields but
   *  stay hidden because the visitor already supplied the location. */
  prefillZip?: string;
  prefillAddress?: string;
  /** Acknowledges that the homepage routing worked, without another field. */
  locationLabel?: string;
  /** Expire the short-lived homepage handoff once the form has hydrated. */
  consumeMarketPrefill?: boolean;
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
  /**
   * WHICH SIGNAL decided `market` — "param" | "zip" | "geo" | "none", straight
   * from lib/resolveMarket.ts via useMarketResolution.
   *
   * app/api/lead/route.ts has accepted, stored and surfaced this field since it
   * shipped, and three admin surfaces read it — but nothing ever SENT it, so
   * every lead in Redis reads "decided by: unknown". This is the missing
   * producer. When the visitor supplies a ZIP in the form below it is
   * overridden to "form-zip", which is the truth at send time regardless of
   * what the page resolved to at render time.
   */
  marketSource?: string | null;
  /**
   * No market is known on a page WITH market selection (the visitor closed the
   * picker without choosing). The form asks for the market itself: a dropdown
   * built from config/markets.ts, plus "My market isn't listed", which reveals
   * a required ZIP that the lead route settles (served / waitlist / held).
   * Pages without market selection (/staging-design-dc) never set this.
   */
  marketChoice?: boolean;
}) {
  const [f, setF] = useState({
    name: prefillName,
    email: prefillEmail,
    phone: "",
    zip: prefillZip,
    address: prefillAddress,
    // marketChoice only: "" (not chosen yet), a market slug, or NOT_LISTED.
    pick: "",
  });
  // Which fields were prefilled (via props, or via ?n=/?e= read on mount) —
  // drives the amber "prefilled" border until the visitor edits the field.
  const [prefilled, setPrefilled] = useState({ name: !!prefillName, email: !!prefillEmail });
  const [nameEdited, setNameEdited] = useState(false);
  const [emailEdited, setEmailEdited] = useState(false);
  const [errs, setErrs] = useState<{ name?: string; email?: string; zip?: string; market?: string; server?: string }>({});
  const [pending, setPending] = useState(false);
  // Set when the lead route sent this submission to the waitlist instead of
  // the CRM (see the market gate in app/api/lead/route.ts). Replaces the form.
  const [diverted, setDiverted] = useState<{ outcome: "waitlist" | "held"; zip: string } | null>(null);
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
    // Keep ?market= and ?zip= so a browser refresh re-resolves the market the
    // visitor chose (geo would otherwise win on reload). Strip everything else:
    // PII (n, e), utm_* already captured above, and any other params.
    const keep = new URLSearchParams();
    for (const k of ["market", "zip"] as const) {
      const v = params.get(k);
      if (v) keep.set(k, v);
    }
    const cleanUrl = keep.size ? `${window.location.pathname}?${keep.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);
    if (consumeMarketPrefill) {
      document.cookie = "curbio_market_prefill=; path=/markets; max-age=0; samesite=lax";
    }
  }, [consumeMarketPrefill]);

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

  // ── THE MARKETLESS GUARD ───────────────────────────────────────────────────
  //
  // Belt and braces behind the locked picker. The picker is the real fix; this
  // is what catches the cases the picker cannot: a JS error that leaves the
  // modal unmounted, stale cached HTML from before the gate shipped, or a
  // `mode: "none"` page whose ZIP field was merely optional.
  //
  // An empty `market.slug` means NEUTRAL_MARKET — nobody knows where this
  // visitor is. In that state the ZIP field is forced visible and REQUIRED, so
  // the form itself cannot produce a lead with neither market nor ZIP. That
  // combination is the one the CRM accepts with a 200 and can route to no one.
  const marketless = !market.slug;
  const notListed = marketChoice && f.pick === NOT_LISTED;
  // A market picked from the dropdown (never NOT_LISTED).
  const chosenSlug = marketChoice && f.pick && f.pick !== NOT_LISTED ? f.pick : null;
  const showZipField = marketChoice ? notListed : showZip || marketless;
  const zipRequired = marketChoice ? notListed : marketless;
  const zipTyped = showZipField && f.zip.trim() !== "";
  // A visible field sends what was typed; otherwise only a ZIP handed over
  // hidden (picker / homepage) — never a stale one left behind by switching
  // the dropdown away from "not listed".
  const zipToSend = (showZipField ? f.zip : prefillZip).replace(/\D/g, "").slice(0, 5);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (pending) return;

      // 1. Validate synchronously before any await
      const next: { name?: string; email?: string; zip?: string; market?: string } = {};
      if (marketChoice && !f.pick)
        next.market = "Choose your market, or pick \u201cMy market isn\u2019t listed\u201d.";
      if (!f.name.trim()) next.name = "Please enter your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
        next.email = "Please enter a valid email address.";
      // No market resolved → a ZIP is the only thing that can route this lead.
      // Blocking here is safe because the field is force-shown in the same
      // state (see the marketless guard above), so the visitor always has
      // somewhere to put the answer we are asking for.
      if (zipRequired && f.zip.replace(/\D/g, "").length !== 5)
        next.zip = "Enter your 5-digit ZIP so we can route you to the right local manager.";
      if (next.name || next.email || next.zip || next.market) {
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
              market: chosenSlug ?? (market.slug || null),
              // The route maps a chosen slug to the CRM's market name itself.
              crmMarketName: chosenSlug ? null : (crmMarketName ?? null),
              variant,
              submittedAt: new Date().toISOString(),
              referralSourceId: refIdRef.current,
              // Attribution model (Curbio Attribution System spec): channel is
              // derived server-side from utm_source; these travel alongside.
              entryPoint: "web_form",
              medium: utms.utm_medium ?? null,
              firstTouchChannel: firstTouch?.channel ?? null,
              firstTouchCampaign: firstTouch?.campaign ?? null,
              // Which signal decided the market. A ZIP typed into this form
              // outranks whatever the page resolved at render time — it is the
              // most recent thing the visitor actually told us.
              // Only a ZIP typed into the VISIBLE field counts: a hidden ZIP
              // carried in from the picker or the homepage was already
              // reflected in `marketSource` by the page.
              marketSource: chosenSlug
                ? "form-select"
                : zipTyped
                  ? "form-zip"
                  : decidedBy(marketSource, market.slug),
              // Spam tripwire — see the lead route.
              renderedAt: renderedAtRef.current,
              ...(zipToSend && { zip: zipToSend }),
              ...(f.address.trim() && { address: f.address.trim() }),
              ...utms,
            }),
          }),
        ]);

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");

        // The route found no served market for this ZIP and put the visitor on
        // the waitlist (or held it for a human). Not a lead: no lead_submit,
        // no /confirm — the form becomes the "not in your area yet" step.
        if (data.outcome === "waitlist" || data.outcome === "held") {
          setDiverted({ outcome: data.outcome, zip: zipToSend });
          return;
        }
        // A marketless lead whose ZIP the route matched to a market.
        const routedSlug: string = typeof data.market === "string" ? data.market : (chosenSlug ?? market.slug);

        // 4. Analytics off the critical path — yield to the browser first
        setTimeout(() => {
          track("lead_submit", { variant });
          trackEvent("lead_submit", {
            market: routedSlug || "unknown",
            variant,
            ga_client_id: gaClientId ?? undefined,
            channel: derivedChannel,
            referral_source_id: refIdRef.current,
          });
        }, 0);

        // 5. Navigate immediately after successful POST. PII travels to
        // /confirm in a short-lived, path-scoped cookie — NEVER in the URL,
        // which would land in browser history, Vercel request logs, and
        // analytics session metadata (input masking doesn't cover URLs).
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
        if (routedSlug) qs.set("market", routedSlug);
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
    [pending, f, market, crmMarketName, variant, source, partnerSlug, router, zipRequired, zipTyped, zipToSend, chosenSlug, marketChoice, marketSource, defaultUtmSource]
  );

  if (diverted) {
    const first = f.name.trim().split(/\s+/)[0];
    return (
      <div className="lp-fc lp-fc-diverted" id="quote-form" role="status">
        {diverted.outcome === "waitlist" ? (
          <>
            <p className="lp-fc-diverted-eyebrow">Thanks{first ? `, ${first}` : ""}</p>
            <h2 className="lp-fc-diverted-title">We&rsquo;re not in your area yet.</h2>
            <p className="lp-fc-diverted-body">
              Curbio doesn&rsquo;t serve ZIP {diverted.zip} yet. We&rsquo;ve saved your details and
              we&rsquo;ll be in touch when we launch near you.
            </p>
          </>
        ) : (
          // Held: the ZIP could not be checked (timeout / lookup failure). We
          // do NOT know it is out of area, so nothing here may say so — the
          // lead is held for a human and Gavin gets "Held for review".
          <h2 className="lp-fc-diverted-title">
            Thanks, we&rsquo;ve got your info and a Curbio manager will follow up.
          </h2>
        )}
      </div>
    );
  }

  return (
    <form className="lp-fc" id="quote-form" onSubmit={submit} onFocusCapture={onFormFocus} noValidate>
      {locationLabel && (
        <div className="c-market-location" aria-label={`Estimate location: ${locationLabel}`}>
          <span>Estimate for</span>
          <strong>{locationLabel}</strong>
        </div>
      )}
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

      {marketChoice && (
        <div className="lp-fc-field">
          <label className="lp-fc-label" htmlFor="fc-market">Market</label>
          <select
            id="fc-market"
            className={"lp-input lp-select" + (errs.market ? " lp-input-err" : "") + (f.pick ? "" : " lp-select-empty")}
            value={f.pick}
            onChange={(e) => {
              const v = e.target.value;
              setF((s) => ({ ...s, pick: v }));
              setErrs((p) => ({ ...p, market: undefined, zip: undefined }));
            }}
            aria-required
            aria-invalid={!!errs.market}
            aria-describedby={errs.market ? "fc-market-err" : undefined}
          >
            <option value="">Select your market</option>
            {MARKET_OPTIONS.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.label}
              </option>
            ))}
            <option value={NOT_LISTED}>My market isn&rsquo;t listed</option>
          </select>
          {errs.market && <span id="fc-market-err" className="lp-fc-err" role="alert">{errs.market}</span>}
        </div>
      )}

      {showZipField && (
        <div className="lp-fc-field">
          <label className="lp-fc-label" htmlFor="fc-zip">
            {marketChoice ? "ZIP code of the home you\u2019re listing" : zipLabel}
            {!zipRequired && <span className="lp-fc-optional"> (optional)</span>}
          </label>
          <input
            id="fc-zip"
            className={"lp-input" + (errs.zip ? " lp-input-err" : "")}
            type="text"
            inputMode="numeric"
            value={f.zip}
            onChange={onChange("zip")}
            placeholder="ZIP code"
            autoComplete="postal-code"
            maxLength={10}
            aria-invalid={!!errs.zip}
            aria-describedby={errs.zip ? "fc-zip-err" : undefined}
          />
          {errs.zip && <span id="fc-zip-err" className="lp-fc-err" role="alert">{errs.zip}</span>}
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
            {/* A marketless lead waits on the server's ZIP check (up to ~3s),
                so say what it is doing rather than a bare "Sending…". */}
            <span className="lp-spinner" aria-hidden /> {zipRequired ? "Checking your ZIP…" : "Sending…"}
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

/**
 * "param" means the market came in on a ?market= URL — but that URL is the
 * same whether someone clicked a campaign link or picked a card in the market
 * picker. The picker leaves a visit-only flag (lib/marketPick.ts); when it
 * names this market, the market was a PICK.
 */
function decidedBy(marketSource: string | null, slug: string): string | null {
  if (marketSource === "param" && slug && readMarketPick() === slug) return "pick";
  return marketSource;
}
