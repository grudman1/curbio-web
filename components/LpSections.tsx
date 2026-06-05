"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { Icon, Eyebrow, AmberRule, PillButton } from "./LpKit";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CtaVariant } from "@/lib/flags";

const LOGO_NAVY = "/logo/curbio-navy.svg";

// Smooth-scroll to the form and focus the first input (honors reduced-motion).
function scrollToForm() {
  const el = document.getElementById("quote-form");
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  window.setTimeout(
    () => document.getElementById("fc-name")?.focus({ preventScroll: true }),
    reduce ? 0 : 480
  );
}

// ── Header (chrome) ──
export function Header({
  market,
  onPickerClick,
}: {
  market: CampaignMarket;
  onPickerClick: () => void;
}) {
  return (
    <header className="lp-header">
      <div className="lp-shell lp-header-inner">
        {/* Logo links back to the home/default-market page */}
        <a href="/" aria-label="Curbio — return to home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_NAVY} alt="Curbio" className="lp-header-logo" />
        </a>
        <button
          className="lp-mkt-btn"
          onClick={onPickerClick}
          aria-label={`Market: ${market.name}. Change market`}
        >
          <Icon name="pin" size={13} color="var(--fg-muted)" stroke={1.75} />
          {market.name}
          <Icon name="chevronDown" size={14} color="var(--fg-muted)" stroke={2} style={{ marginLeft: 1 }} />
        </button>
      </div>
    </header>
  );
}

// ── a. Hero ──
export function Hero({
  market,
  variant,
  ctaCopy,
}: {
  market: CampaignMarket;
  variant: CtaVariant;
  ctaCopy: string;
}) {
  return (
    <section className="lp-hero" id="hero">
      <div className="lp-shell lp-hero-grid">
        <div className="lp-hero-copy">
          <Eyebrow style={{ marginBottom: 18, color: "var(--fg-muted)" }}>{market.name} agents</Eyebrow>
          <h1 className="lp-hero-h1">
            We do the <em>prep.</em>
            <br />
            You make the <em>sale.</em>
            <br />
            Seller pays <em>at close.</em>
          </h1>
          <AmberRule width={48} style={{ margin: "22px 0" }} />
          <p className="lp-hero-sub">
            We renovate, paint, stage, and repair before you list. Your seller pays
            nothing until the home sells.
          </p>
          <p className="lp-hero-trust">
            Licensed &amp; insured · 8,000+ homes prepped · Pay at close
          </p>
        </div>
        <div className="lp-hero-form-col">
          <FormCard market={market} variant={variant} ctaCopy={ctaCopy} />
        </div>
      </div>
    </section>
  );
}

// ── FormCard (#quote-form) ──
function FormCard({
  market,
  variant,
  ctaCopy,
}: {
  market: CampaignMarket;
  variant: CtaVariant;
  ctaCopy: string;
}) {
  const [f, setF] = useState({ name: "", email: "", phone: "" });
  const [errs, setErrs] = useState<{ name?: string; email?: string; server?: string }>({});
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const onChange = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setErrs((p) => ({ ...p, [k]: undefined }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    const next: typeof errs = {};
    if (!f.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      next.email = "Please enter a valid email address.";
    if (next.name || next.email) {
      setErrs(next);
      return;
    }
    setPending(true);
    setErrs({});
    const full = f.name.trim();
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: full,
          firstName: full.split(/\s+/)[0],
          email: f.email.trim(),
          phone: f.phone.trim() || undefined,
          source: `email-campaign-${market.slug}`,
          market: market.slug,
          variant,
          submittedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      track("lead_submit", { variant });
      setSent(true);
    } catch (err) {
      setErrs({ server: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="lp-fc lp-fc-sent" id="quote-form" role="status" aria-live="polite">
        <span className="lp-fc-check">
          <Icon name="checkCircle" size={24} color="var(--amber)" stroke={2} />
        </span>
        <p className="lp-fc-sent-h">We&apos;ll be in touch.</p>
        <p className="lp-fc-sent-sub">Expect to hear from us within one business day.</p>
      </div>
    );
  }

  return (
    <form className="lp-fc" id="quote-form" onSubmit={submit} noValidate>
      <p className="lp-fc-h">Get your free prep plan.</p>

      <div className="lp-fc-field">
        <label className="lp-fc-label" htmlFor="fc-name">Full name</label>
        <input
          id="fc-name"
          className={"lp-input" + (errs.name ? " lp-input-err" : "")}
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
        <label className="lp-fc-label" htmlFor="fc-email">Work email</label>
        <input
          id="fc-email"
          className={"lp-input" + (errs.email ? " lp-input-err" : "")}
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
        <label className="lp-fc-label" htmlFor="fc-phone">Phone</label>
        <input
          id="fc-phone"
          className="lp-input"
          type="tel"
          inputMode="tel"
          value={f.phone}
          onChange={onChange("phone")}
          placeholder="(555) 555-5555"
          autoComplete="tel"
          aria-describedby="fc-phone-help"
        />
        <span id="fc-phone-help" className="lp-fc-help">Optional. Helps us reach you faster.</span>
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
        By submitting this form, you consent to receive calls and texts from Curbio
        at the number provided, including by autodialer. Msg &amp; data rates may
        apply. Consent is not a condition of purchase. Reply STOP to opt out.{" "}
        <a href="https://curbio.com/privacy-policy" target="_blank" rel="noreferrer noopener">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}

// ── b. Sold-proof strip ──
export function SoldProofStrip({ market }: { market: CampaignMarket }) {
  return (
    <section className="lp-sold" id="sold">
      <div className="lp-shell">
        <Eyebrow style={{ textAlign: "center", color: "var(--fg-muted)" }}>
          Prepped by Curbio. Sold by {market.name} REALTORS&reg;
        </Eyebrow>
        <ul className="lp-sold-row">
          {market.sold.map((p) => (
            <li className="lp-sold-card" key={p.neighborhood}>
              <div className={"lp-sold-photo" + (p.photo ? "" : " lp-ph lp-ph-warm")} aria-hidden>
                {p.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photo}
                    alt={`${p.neighborhood} home prepped by Curbio`}
                    loading="lazy"
                    decoding="async"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}
                <span className="lp-sold-pill">
                  <Icon name="check" size={12} color="#fff" stroke={2.5} /> Sold
                </span>
              </div>
              <div className="lp-sold-body">
                <span className="lp-sold-hood">{p.neighborhood}</span>
                {p.price && <span className="lp-sold-price">{p.price}</span>}
                <span className="lp-sold-note">Prepped by Curbio</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── How it works ──
const STEPS = [
  {
    icon: "clipboardCheck",
    title: "We assess the home.",
    body: "A local Curbio manager walks the property and builds a prep plan.",
  },
  {
    icon: "wrench",
    title: "We do the work.",
    body: "Paint, repairs, staging, updates. One team, one timeline.",
  },
  {
    icon: "dollar",
    title: "Your seller pays at close.",
    body: "No upfront cost. Qualified sellers pay when the home sells.",
  },
];

export function HowItWorks() {
  return (
    <section className="lp-how" id="how">
      <div className="lp-shell">
        <h2 className="lp-h2 lp-how-title">
          One call. <em>We handle the rest.</em>
        </h2>
        <ol className="lp-how-steps">
          {STEPS.map((s) => (
            <li className="lp-how-step" key={s.title}>
              <span className="lp-icon-disc">
                <Icon name={s.icon} size={22} color="var(--navy)" stroke={1.75} />
              </span>
              <h3 className="lp-how-step-h">{s.title}</h3>
              <p className="lp-how-step-b">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── Navy CTA closer ──
export function Closer({ ctaCopy }: { ctaCopy: string }) {
  return (
    <section className="lp-closer" id="closer">
      <div className="lp-shell lp-closer-inner">
        <h2 className="lp-closer-h">
          Try it on one listing. You&apos;ll wonder <em>why you waited.</em>
        </h2>
        <div className="lp-closer-cta">
          <PillButton size="lg" icon="arrow" onClick={scrollToForm}>
            {ctaCopy}
          </PillButton>
        </div>
      </div>
    </section>
  );
}

// ── Sticky bottom bar (chrome) ──
export function StickyBar({ ctaCopy }: { ctaCopy: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const form = document.getElementById("quote-form");
    if (!form) return;
    // Show the bar whenever the form is NOT in view (hero scrolled past),
    // hide it when the form re-enters view.
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(form);
    return () => io.disconnect();
  }, []);

  return (
    <div className={"lp-sticky" + (show ? " show" : "")} aria-hidden={!show}>
      <div className="lp-shell lp-sticky-inner">
        <span className="lp-sticky-txt">Your seller pays nothing until the home sells.</span>
        <button className="lp-sticky-cta" onClick={scrollToForm} tabIndex={show ? 0 : -1}>
          {ctaCopy}
          <Icon name="arrow" size={17} color="currentColor" />
        </button>
      </div>
    </div>
  );
}

// ── Footer (chrome) ──
export function Footer() {
  return (
    <footer className="lp-foot">
      <div className="lp-shell lp-foot-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/curbio-white.svg" alt="Curbio" className="lp-foot-logo" />
        <span className="lp-foot-tag">The pre-listing home improvement experts.</span>
        <span className="lp-foot-legal">© Curbio. Licensed &amp; insured.</span>
      </div>
    </footer>
  );
}

// ── Waitlist page (out-of-area state) ──────────────────────────────────────
export function WaitlistPage({
  zip,
  geoCity: _geoCity,
  geoRegion: _geoRegion,
  onChooseMarket,
}: {
  zip: string;
  geoCity?: string;
  geoRegion?: string;
  onChooseMarket: () => void;
}) {
  const [f, setF] = useState({ name: "", email: "", zip: zip });
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  useEffect(() => { setF((s) => ({ ...s, zip })); }, [zip]);

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const valid = f.name.trim().length > 0 && validEmail(f.email) && f.zip.replace(/\D/g, "").length === 5;

  async function submit() {
    if (!valid || pending) return;
    setPending(true);
    setServerErr(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          email: f.email.trim(),
          zip: f.zip.replace(/\D/g, "").slice(0, 5),
          source: "waitlist",
          submittedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setSent(true);
    } catch (e) {
      setServerErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const displayZip = f.zip.replace(/\D/g, "").slice(0, 5) || zip || "your area";

  return (
    <section className="lp-waitlist">
      <div className="lp-shell lp-waitlist-inner">
        {!sent ? (
          <>
            <Eyebrow amber style={{ marginBottom: 14 }}>Coming to your area</Eyebrow>
            <h1 className="lp-waitlist-h1">
              Curbio isn&apos;t in your area <em>yet.</em>
            </h1>
            <p className="lp-waitlist-sub">
              We&apos;re expanding fast. Add your details and we&apos;ll reach out the
              moment a local Curbio team covers your area.
            </p>
            <AmberRule width={56} style={{ margin: "22px 0 26px" }} />
            <div className="lp-waitlist-fields">
              <div className="lp-fc-field">
                <label className="lp-fc-label" htmlFor="wl-name">Full name</label>
                <input
                  id="wl-name"
                  className="lp-input"
                  type="text"
                  value={f.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="lp-fc-field">
                <label className="lp-fc-label" htmlFor="wl-email">Work email</label>
                <input
                  id="wl-email"
                  className="lp-input"
                  type="email"
                  value={f.email}
                  onChange={(e) => set("email")(e.target.value)}
                  placeholder="you@brokerage.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="lp-fc-field">
                <label className="lp-fc-label" htmlFor="wl-zip">ZIP code</label>
                <input
                  id="wl-zip"
                  className="lp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={f.zip}
                  onChange={(e) => set("zip")(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="e.g. 80202"
                  required
                />
              </div>
            </div>
            {serverErr && (
              <p role="alert" className="lp-fc-server">{serverErr}</p>
            )}
            <button
              className="lp-fc-submit"
              onClick={submit}
              disabled={!valid || pending}
            >
              {pending ? "Joining…" : "Join the waitlist"}
            </button>
            <p className="lp-fc-tcpa" style={{ marginTop: 12 }}>
              By submitting you agree to receive email updates from Curbio. We never share your information.
            </p>
            <div className="lp-waitlist-alt">
              <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>Already in a Curbio market?</span>{" "}
              <button
                onClick={onChooseMarket}
                style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700, color: "var(--amber)", background: "none", border: 0, cursor: "pointer", padding: 0 }}
              >
                Choose your market →
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", maxWidth: 440, margin: "0 auto", padding: "20px 0" }}>
            <div style={{ width: 62, height: 62, borderRadius: 999, background: "var(--stone)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
              <Icon name="check" size={28} color="var(--amber)" stroke={2.5} />
            </div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 600, color: "var(--navy)", margin: "0 0 12px", lineHeight: 1.1 }}>
              You&apos;re on the list.
            </h2>
            <p style={{ fontSize: 15, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
              We&apos;ll let you know the moment Curbio reaches{" "}
              <strong style={{ color: "var(--navy)" }}>{displayZip}</strong>.
            </p>
            <button
              onClick={onChooseMarket}
              style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700, color: "var(--amber)", background: "none", border: 0, cursor: "pointer" }}
            >
              See our current markets →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
