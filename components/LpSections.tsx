"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { Icon, Eyebrow, AmberRule, PillButton } from "./LpKit";
import { ATLANTA_SOLD, ATLANTA_SOLD_CAPTION } from "@/lib/atlantaSoldProjects";
import type { CtaVariant } from "@/lib/flags";

const LOGO_NAVY = "/logo/curbio-navy.svg";

// Atlanta Home Services Manager (from markets.json). Last name "Harvey" is
// carried in markets.json; FLAG to confirm before a real send.
const ATLANTA_HSM = {
  name: "Christine Harvey",
  phone: "703-927-9606",
  phoneRaw: "+17039279606",
  calendlyUrl: "https://calendly.com/charvey-curbio",
  photo: "/hsm/christine-harvey.jpg",
};

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
export function Header() {
  return (
    <header className="lp-header">
      <div className="lp-shell lp-header-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_NAVY} alt="Curbio" className="lp-header-logo" />
        <span className="lp-header-tag">Atlanta</span>
      </div>
    </header>
  );
}

// ── a. Hero ──
export function Hero({ variant, ctaCopy }: { variant: CtaVariant; ctaCopy: string }) {
  return (
    <section className="lp-hero" id="hero">
      <div className="lp-shell lp-hero-grid">
        <div className="lp-hero-copy">
          <Eyebrow style={{ marginBottom: 18, color: "var(--fg-muted)" }}>Atlanta agents</Eyebrow>
          <h1 className="lp-hero-h1">
            <em>You win the listing.</em>
            <br />
            We do the work.
            <br />
            <em>Your seller pays at close.</em>
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
          <FormCard variant={variant} ctaCopy={ctaCopy} />
        </div>
      </div>
    </section>
  );
}

// ── FormCard (#quote-form) ──
function FormCard({ variant, ctaCopy }: { variant: CtaVariant; ctaCopy: string }) {
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
          source: "email-campaign-atlanta",
          market: "atlanta",
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
      <div className="lp-fc lp-fc-sent" id="quote-form">
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
        />
        {errs.name && <span className="lp-fc-err" role="alert">{errs.name}</span>}
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
        />
        {errs.email && <span className="lp-fc-err" role="alert">{errs.email}</span>}
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
        />
        <span className="lp-fc-help">Optional. Helps us reach you faster.</span>
      </div>

      {errs.server && <p className="lp-fc-server" role="alert">{errs.server}</p>}

      <button className="lp-fc-submit" type="submit" disabled={pending}>
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
export function SoldProofStrip() {
  return (
    <section className="lp-sold" id="sold">
      <div className="lp-shell">
        <Eyebrow style={{ textAlign: "center", color: "var(--fg-muted)" }}>Sold across Atlanta</Eyebrow>
        <ul className="lp-sold-row">
          {ATLANTA_SOLD.map((p) => (
            <li className="lp-sold-card" key={p.neighborhood}>
              <div className="lp-sold-photo lp-ph lp-ph-warm" aria-hidden>
                <span className="lp-sold-pill">
                  <Icon name="check" size={12} color="var(--navy)" stroke={2.25} /> Sold
                </span>
              </div>
              <div className="lp-sold-body">
                <span className="lp-sold-hood">{p.neighborhood}</span>
                <span className="lp-sold-price">{p.price}</span>
                <span className="lp-sold-note">Prepped by Curbio</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="lp-sold-cap">{ATLANTA_SOLD_CAPTION}</p>
      </div>
    </section>
  );
}

// ── c. Before / After ──
export function BeforeAfter() {
  return (
    <section className="lp-ba" id="before-after">
      <div className="lp-shell">
        <h2 className="lp-h2 lp-ba-title">
          See what prep does to a <em>listing.</em>
        </h2>
        <div className="lp-ba-pair">
          <figure className="lp-ba-fig">
            <div className="lp-ba-img lp-ph lp-ph-dim" aria-hidden>
              <span className="lp-ba-tag lp-ba-tag-before">Before</span>
            </div>
          </figure>
          <figure className="lp-ba-fig">
            <div className="lp-ba-img lp-ph lp-ph-warm" aria-hidden>
              <span className="lp-ba-tag lp-ba-tag-after">After</span>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}

// ── d. How it works ──
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
    body: "No upfront cost. We're paid from the sale proceeds.",
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

// ── e. Navy CTA closer ──
export function Closer({ ctaCopy }: { ctaCopy: string }) {
  return (
    <section className="lp-closer" id="closer">
      <div className="lp-shell lp-closer-inner">
        <h2 className="lp-closer-h">
          List with confidence. We&apos;ll <em>take care</em> of the rest.
        </h2>
        <p className="lp-closer-sub">
          A free prep plan, no upfront cost. Your seller pays only when the home sells.
        </p>
        <div className="lp-closer-cta">
          <PillButton size="lg" icon="arrow" onClick={scrollToForm}>
            {ctaCopy}
          </PillButton>
        </div>
        <div className="lp-closer-hsm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ATLANTA_HSM.photo}
            alt={`${ATLANTA_HSM.name}, Curbio Atlanta Home Services Manager`}
            className="lp-closer-hsm-photo"
            loading="lazy"
            decoding="async"
          />
          <div className="lp-closer-hsm-info">
            <span className="lp-closer-hsm-led">
              Your Atlanta team is led by <strong>{ATLANTA_HSM.name}</strong>.
            </span>
            <span className="lp-closer-hsm-links">
              <a href={`tel:${ATLANTA_HSM.phoneRaw}`}>{ATLANTA_HSM.phone}</a>
              <span className="lp-closer-hsm-dot" aria-hidden>·</span>
              <a href={ATLANTA_HSM.calendlyUrl} target="_blank" rel="noreferrer noopener">
                Book a call
              </a>
            </span>
          </div>
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
