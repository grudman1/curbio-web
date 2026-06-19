"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { captureAttribution, gaEvent, getGaClientId, getStoredUtms } from "@/lib/analytics";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CtaVariant } from "@/lib/flags";

export function FormCard({
  market,
  crmMarketName = null,
  variant,
  ctaCopy,
  prefillName = "",
  prefillEmail = "",
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  variant: CtaVariant;
  ctaCopy: string;
  prefillName?: string;
  prefillEmail?: string;
}) {
  const [f, setF] = useState({ name: prefillName, email: prefillEmail, phone: "" });
  const [nameEdited, setNameEdited] = useState(false);
  const [emailEdited, setEmailEdited] = useState(false);
  const [errs, setErrs] = useState<{ name?: string; email?: string; server?: string }>({});
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // ORDER IS LOAD-BEARING: captureAttribution() reads utm_* from the live
    // URL, persists them, and queues the GA4 page_view — all synchronously —
    // BEFORE the strip below wipes the query string for the clean URL.
    captureAttribution();
    // Keep ?market= so a browser refresh re-resolves the correct market via the
    // server (geo would otherwise win on reload). Strip everything else: PII
    // (n, e), utm_* already captured above, and any other params.
    const marketSlug = new URLSearchParams(window.location.search).get("market");
    const cleanUrl = marketSlug
      ? `${window.location.pathname}?market=${encodeURIComponent(marketSlug)}`
      : window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);
  }, []);

  const onChange = useCallback(
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const utms = getStoredUtms();

      try {
        // 3. Resolve GA client ID and POST in parallel so neither blocks the other
        const [gaClientId, res] = await Promise.all([
          getGaClientId(),
          fetch("/api/lead", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: full,
              firstName: full.split(/\s+/)[0],
              email: f.email.trim(),
              phone: f.phone.trim() || undefined,
              source: `email-campaign-${market.slug || "unknown"}`,
              market: market.slug || null,
              crmMarketName: crmMarketName ?? null,
              variant,
              submittedAt: new Date().toISOString(),
              gaClientId: null, // resolved concurrently; used below for analytics only
              ...utms,
            }),
          }),
        ]);

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");

        // 4. Analytics off the critical path — yield to the browser first
        setTimeout(() => {
          track("lead_submit", { variant });
          gaEvent("lead_submit", { market: market.slug || "unknown", variant, ga_client_id: gaClientId ?? undefined });
        }, 0);

        // 5. Navigate immediately after successful POST
        const qs = new URLSearchParams();
        if (market.slug) qs.set("market", market.slug);
        qs.set("name", f.name.trim());
        qs.set("email", f.email.trim());
        if (f.phone.trim()) qs.set("phone", f.phone.trim());
        router.push(`/confirm?${qs.toString()}`);
      } catch (err) {
        setErrs({ server: err instanceof Error ? err.message : "Something went wrong." });
      } finally {
        setPending(false);
      }
    },
    [pending, f, market, crmMarketName, variant, router]
  );

  return (
    <form className="lp-fc" id="quote-form" onSubmit={submit} noValidate>
      <div className="lp-fc-field">
        <label className="lp-fc-label" htmlFor="fc-name">Name</label>
        <input
          id="fc-name"
          className={"lp-input" + (errs.name ? " lp-input-err" : prefillName && !nameEdited ? " lp-input-prefilled" : "")}
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
          className={"lp-input" + (errs.email ? " lp-input-err" : prefillEmail && !emailEdited ? " lp-input-prefilled" : "")}
          type="email"
          value={f.email}
          onChange={onChange("email")}
          placeholder="you@brokerage.com"
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
