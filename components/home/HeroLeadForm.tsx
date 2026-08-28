"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureAttribution, getFirstTouch, getStoredUtms } from "@/lib/analytics";
import { trackEvent } from "@/lib/events";
import { MARKETS } from "@/config/markets";
import { HERO_ATTRIBUTION_OPTIONS, HERO_ATTRIBUTION_QUESTION } from "@/config/featureFlags";

// ─────────────────────────────────────────────────────────────────────────────
// The hero field — LIVE. It was an inert input until now (see the STUB note
// that used to sit in HomeHero.tsx); this is the wiring.
//
// TWO STEPS, and the split is the point. Step one is a single field, because
// the hero's job is to be answerable in one gesture from a phone. Step two
// asks for the name and email /api/lead actually requires, and it only ever
// appears AFTER the visitor has already committed something — the classic
// foot-in-the-door, and the reason the hero isn't a four-field form.
//
// ── What the field accepts ──────────────────────────────────────────────────
// "ZIP, market, or address", literally: a five-digit ZIP anywhere in the
// string wins, otherwise a market name match, otherwise the whole string
// travels as `address`. Whatever it is, /api/resolve turns it into a market
// slug + the CRM's own market name, so the lead routes to a manager instead
// of landing in a general queue. Resolution failure is NOT a blocker — the
// lead posts market-less rather than being lost.
//
// ── Lead plumbing ───────────────────────────────────────────────────────────
// Same pipeline as every other form on the site: POST /api/lead, which
// persists to Redis BEFORE attempting CRM/email delivery. Read that route's
// header comment before changing anything here — four anti-abuse mechanisms
// were removed from it for eating real leads, and nothing in this file may
// reject a submission the route would accept.
//
// captureAttribution() runs on mount, BEFORE the URL strip, exactly as in
// FormCard/ContactForm — that ordering is load-bearing for UTM capture.
// First-touch is read from the ~90-day write-once localStorage store.
//
// `source: "home-hero"` and NOT "quote": the route requires a 10-digit phone
// for source "quote" only, and phone is optional here on purpose. The route's
// name+email requirement is enforced in step two below.
// ─────────────────────────────────────────────────────────────────────────────

type Resolved = {
  source: string;
  slug: string | null;
  crmMarketName: string | null;
};

/** Pull the strongest signal out of one free-text field. */
function parseLocation(raw: string): { zip?: string; market?: string; address?: string } {
  const text = raw.trim();
  const zip = text.match(/\b(\d{5})\b/)?.[1];
  if (zip) return { zip, address: /[a-z]/i.test(text) ? text : undefined };

  const lower = text.toLowerCase();
  const hit = MARKETS.find(
    (m) =>
      lower === m.slug ||
      lower.includes(m.slug.replace(/-/g, " ")) ||
      lower.includes(m.name.toLowerCase())
  );
  if (hit) return { market: hit.slug, address: undefined };

  return { address: text };
}

export function HeroLeadForm() {
  const [where, setWhere] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState({ name: "", email: "", phone: "", heardVia: "" });
  const [errs, setErrs] = useState<{ where?: string; name?: string; email?: string; server?: string }>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const renderedAtRef = useRef(0);
  const resolvedRef = useRef<Resolved | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const formStartFired = useRef(false);
  const onFormFocus = useCallback(() => {
    if (formStartFired.current) return;
    formStartFired.current = true;
    trackEvent("form_start", { form_id: "home-hero", market: "unknown", variant: "control" });
  }, []);

  useEffect(() => {
    renderedAtRef.current = Date.now();
    // ORDER IS LOAD-BEARING: read + persist utm_* and queue the GA4 page_view
    // synchronously, before the strip wipes the query string.
    captureAttribution();
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  // Step one → step two. Resolution is fired here, not at submit, so the
  // network round trip overlaps the time the visitor spends typing their name.
  const advance = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!where.trim()) {
        setErrs({ where: "Enter a ZIP, market, or address so we can route you." });
        return;
      }
      setErrs({});
      const parsed = parseLocation(where);
      const qs = new URLSearchParams();
      if (parsed.zip) qs.set("zip", parsed.zip);
      if (parsed.market) qs.set("market", parsed.market);
      if (qs.toString()) {
        fetch(`/api/resolve?${qs}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d: Resolved | null) => {
            resolvedRef.current = d;
          })
          .catch(() => {
            // Non-blocking by design — a market-less lead still reaches a human.
          });
      }
      // "cta_click", not a new "form_step": lib/events.ts's EventName is a
      // closed list, and one page's flow is not a reason to widen the site's
      // event taxonomy — the cta_id carries the step.
      trackEvent("cta_click", {
        cta_id: "home-hero-step2",
        market: parsed.market ?? "unknown",
        variant: "control",
      });
      setStep(2);
    },
    [where]
  );

  // Focus the first step-two field when it appears, so the flow keeps its
  // momentum instead of asking for a second tap.
  useEffect(() => {
    if (step === 2) nameRef.current?.focus();
  }, [step]);

  const onChange = useCallback(
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setF((s) => ({ ...s, [k]: e.target.value }));
      setErrs((p) => ({ ...p, [k]: undefined }));
    },
    []
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (pending) return;

      const next: { name?: string; email?: string } = {};
      if (!f.name.trim()) next.name = "Please enter your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
        next.email = "Please enter a valid email address.";
      if (next.name || next.email) {
        setErrs(next);
        return;
      }

      setPending(true);
      setErrs({});

      const parsed = parseLocation(where);
      const resolved = resolvedRef.current;
      const utms = getStoredUtms();
      const firstTouch = getFirstTouch();
      // The flagged question is context for a human, not a payload field —
      // the contract has no slot for it, so it rides inside `description`
      // exactly the way /contact carries its topic.
      const heard = f.heardVia ? `Heard about Curbio via: ${f.heardVia}. ` : "";

      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: f.name.trim(),
            email: f.email.trim(),
            phone: f.phone.trim() || undefined,
            zip: parsed.zip,
            address: parsed.address,
            market: resolved?.slug ?? parsed.market ?? null,
            crmMarketName: resolved?.crmMarketName ?? null,
            marketSource: resolved?.source,
            description: `${heard}Requested an estimate from the homepage hero (entered "${where.trim()}").`,
            source: "home-hero",
            submittedAt: new Date().toISOString(),
            entryPoint: "web_form",
            medium: utms.utm_medium ?? null,
            firstTouchChannel: firstTouch?.channel ?? null,
            firstTouchCampaign: firstTouch?.campaign ?? null,
            renderedAt: renderedAtRef.current,
            ...utms,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");

        setTimeout(() => {
          trackEvent("lead_submit", {
            market: resolved?.slug ?? parsed.market ?? "unknown",
            variant: "control",
          });
        }, 0);
        setSent(true);
      } catch (err) {
        setErrs({ server: err instanceof Error ? err.message : "Something went wrong." });
      } finally {
        setPending(false);
      }
    },
    [pending, f, where]
  );

  if (sent) {
    return (
      <div className="c-hero-form c-hero-done" role="status">
        <p className="c-hero-done-h">Done — your local manager will reach out.</p>
        <p className="c-hero-done-p">Not a call center. Usually within one business day.</p>
      </div>
    );
  }

  return (
    <div className="c-hero-form" onFocusCapture={onFormFocus}>
      <form onSubmit={step === 1 ? advance : submit} noValidate>
        <label className="c-hero-formlabel" htmlFor="c-zip">
          Enter your ZIP, market, or address to reach your local manager
        </label>
        <div className="c-hero-search">
          <input
            id="c-zip"
            type="text"
            placeholder="ZIP, market, or address"
            autoComplete="postal-code"
            value={where}
            onChange={(e) => {
              setWhere(e.target.value);
              setErrs((p) => ({ ...p, where: undefined }));
            }}
            aria-invalid={!!errs.where}
            aria-describedby={errs.where ? "c-zip-err" : undefined}
          />
          {step === 1 && <button type="submit">Get free estimate</button>}
        </div>
        {errs.where && (
          <p id="c-zip-err" className="c-hero-err" role="alert">
            {errs.where}
          </p>
        )}

        {step === 2 && (
          <div className="c-hero-step2">
            <p className="c-hero-step2-h">And where should your manager reach you?</p>
            <div className="c-hero-fields">
              <div className="cl2-field">
                <label className="c-sr-only" htmlFor="c-hero-name">
                  Your name
                </label>
                <input
                  ref={nameRef}
                  id="c-hero-name"
                  className="cl2-input"
                  type="text"
                  placeholder="Your name"
                  autoComplete="name"
                  value={f.name}
                  onChange={onChange("name")}
                  aria-invalid={!!errs.name}
                  aria-describedby={errs.name ? "c-hero-name-err" : undefined}
                />
                {errs.name && (
                  <span id="c-hero-name-err" className="cl2-error" role="alert">
                    {errs.name}
                  </span>
                )}
              </div>
              <div className="cl2-field">
                <label className="c-sr-only" htmlFor="c-hero-email">
                  Email
                </label>
                <input
                  id="c-hero-email"
                  className="cl2-input"
                  type="email"
                  placeholder="you@brokerage.com"
                  autoComplete="email"
                  value={f.email}
                  onChange={onChange("email")}
                  aria-invalid={!!errs.email}
                  aria-describedby={errs.email ? "c-hero-email-err" : undefined}
                />
                {errs.email && (
                  <span id="c-hero-email-err" className="cl2-error" role="alert">
                    {errs.email}
                  </span>
                )}
              </div>
              <div className="cl2-field">
                <label className="c-sr-only" htmlFor="c-hero-phone">
                  Phone (optional)
                </label>
                <input
                  id="c-hero-phone"
                  className="cl2-input"
                  type="tel"
                  inputMode="tel"
                  placeholder="Phone (optional)"
                  autoComplete="tel"
                  value={f.phone}
                  onChange={onChange("phone")}
                />
              </div>

              {/* A/B arm, flag-gated OFF — see config/featureFlags.ts. */}
              {HERO_ATTRIBUTION_QUESTION && (
                <div className="cl2-field">
                  <label className="c-sr-only" htmlFor="c-hero-heard">
                    How did you hear about us?
                  </label>
                  <select
                    id="c-hero-heard"
                    className="cl2-input"
                    value={f.heardVia}
                    onChange={onChange("heardVia")}
                  >
                    <option value="">How did you hear about us? (optional)</option>
                    {HERO_ATTRIBUTION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {errs.server && (
              <p className="cl2-error" role="alert">
                {errs.server}
              </p>
            )}

            <button className="c-cta c-hero-submit" type="submit" disabled={pending} aria-busy={pending}>
              {pending ? "Sending…" : "Get free estimate"}
            </button>
            <p className="c-hero-fine">
              By submitting, you agree to our{" "}
              <a href="https://curbio.com/privacy-policy" target="_blank" rel="noreferrer noopener">
                Privacy Policy
              </a>{" "}
              and consent to calls and texts from Curbio. Reply STOP to opt out.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
