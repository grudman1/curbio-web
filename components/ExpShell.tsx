import Image from "next/image";
import { FormCard } from "./FormCard";
import { Closer } from "./LpSections";
import { Icon, PillButton } from "./LpKit";
import { EXP_PARTNER } from "@/lib/partners";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CtaVariant } from "@/lib/flags";

// ── Header — co-brand lockup: Curbio logo + eXp badge ──
function ExpHeader() {
  return (
    <header className="lp-header">
      <div className="lp-shell lp-header-inner">
        {/* Logo links to curbio.com (external WordPress home) — update when replatforming is complete */}
        <a href="https://curbio.com" aria-label="Curbio — visit curbio.com">
          <Image
            src="/logo/curbio-navy.svg"
            alt="Curbio"
            width={500}
            height={130}
            priority
            unoptimized
            className="lp-header-logo"
          />
        </a>
        <div className="exp-cobrand">
          <Image
            src={EXP_PARTNER.badgePath ?? EXP_PARTNER.logoPath}
            alt={`${EXP_PARTNER.name} — Trusted Provider`}
            width={140}
            height={48}
            unoptimized
            className="exp-cobrand-badge"
          />
        </div>
      </div>
    </header>
  );
}

// ── Hero — placeholder copy + shared form ──
function ExpHero({
  market,
  crmMarketName,
  variant,
  ctaCopy,
}: {
  market: CampaignMarket;
  crmMarketName: string | null;
  variant: CtaVariant;
  ctaCopy: string;
}) {
  return (
    <section className="lp-hero" id="hero">
      <div className="lp-shell lp-hero-grid">
        <div className="lp-hero-copy">
          {/* PLACEHOLDER — replace with final eXp hero headline + subhead */}
          <p className="exp-eyebrow">For eXp Realty agents</p>
          <h1 className="lp-hero-h1">
            Get your listings <em>market-ready.</em>
            <br />
            We do the work.
            <br />
            Seller pays <em>at close.</em>
          </h1>
          <div style={{ width: 48, height: 3, background: "var(--amber)", margin: "22px 0" }} />
          <p className="lp-hero-sub">
            {/* PLACEHOLDER — replace with eXp-specific value prop copy */}
            As a Curbio Trusted Provider for eXp Realty, your clients get fully managed
            pre-listing prep — paint, repairs, staging — with nothing due until the home sells.
          </p>
          <div className="lp-hero-trust">
            <span className="lp-sold-proof">
              <Icon name="home" size={12} color="var(--fg-muted)" stroke={2} />
              8,000+ homes prepped
            </span>
            <span className="lp-sold-proof-dot" aria-hidden>·</span>
            <span className="lp-sold-proof">
              <Icon name="shield" size={12} color="var(--fg-muted)" stroke={2} />
              1-year warranty
            </span>
            <span className="lp-sold-proof-dot" aria-hidden>·</span>
            <span className="lp-sold-proof">
              <Icon name="check" size={12} color="var(--fg-muted)" stroke={2.5} />
              Licensed &amp; insured
            </span>
          </div>
        </div>
        <div className="lp-hero-form-col">
          <FormCard
            market={market}
            crmMarketName={crmMarketName}
            variant={variant}
            ctaCopy={ctaCopy}
            referralSourceId={EXP_PARTNER.referralSourceId}
            source={`exp-realty-${market.slug || "unknown"}`}
            showZip
            showAddress
          />
        </div>
      </div>
    </section>
  );
}

// ── How your eXp Solution works — placeholder steps ──
function ExpHowItWorks() {
  // PLACEHOLDER — replace steps with final eXp-specific copy
  const steps = [
    {
      icon: "clipboardCheck",
      title: "Submit a property.",
      body: "Share your listing address and your Curbio Home Services Manager will reach out within one business day.",
    },
    {
      icon: "wrench",
      title: "We scope and execute.",
      body: "Paint, repairs, staging — one team, one timeline, zero upfront cost for your seller.",
    },
    {
      icon: "dollar",
      title: "Seller pays at close.",
      body: "Qualified sellers pay from proceeds. No out-of-pocket, no financing application.",
    },
  ];

  return (
    <section className="lp-how" id="how">
      <div className="lp-shell">
        {/* PLACEHOLDER — replace with final eXp section headline */}
        <h2 className="exp-section-h">How your eXp + Curbio solution works</h2>
        <ol className="lp-how-steps">
          {steps.map((s) => (
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

// ── Trust band — placeholder proof strip ──
function ExpTrustBand() {
  // PLACEHOLDER — replace with real eXp proof points / stats / logos
  const points = [
    { icon: "home", label: "8,000+ homes prepped nationally" },
    { icon: "check", label: "Preferred partner of eXp Realty" },
    { icon: "shield", label: "Licensed GC · 1-year warranty" },
    { icon: "clock", label: "Projects start in days, not weeks" },
  ];

  return (
    <section className="exp-trust-band">
      <div className="lp-shell">
        <ul className="exp-trust-list">
          {points.map((p) => (
            <li key={p.label} className="exp-trust-item">
              <Icon name={p.icon} size={18} color="var(--amber)" stroke={2} />
              <span>{p.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Shell — composes all /exp sections ──
export default function ExpShell({
  market,
  crmMarketName = null,
  variant,
  ctaCopy,
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  variant: CtaVariant;
  ctaCopy: string;
}) {
  return (
    <>
      <ExpHeader />
      <main>
        <ExpHero market={market} crmMarketName={crmMarketName} variant={variant} ctaCopy={ctaCopy} />
        <ExpHowItWorks />
        <ExpTrustBand />
        <Closer ctaCopy={ctaCopy} />
      </main>
    </>
  );
}
