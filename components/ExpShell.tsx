import Image from "next/image";
import { FormCard } from "./FormCard";
import { Closer } from "./LpSections";
import { Icon, Eyebrow, AmberRule, PillButton } from "./LpKit";
import { EXP_PARTNER } from "@/lib/partners";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CtaVariant } from "@/lib/flags";

// ── Header — co-brand: Curbio + divider + eXp Solutions logo + amber CTA ──
function ExpHeader() {
  return (
    <header className="lp-header">
      <div className="lp-shell lp-header-inner">
        <div className="exp-header-logos">
          <a href="https://curbio.com" aria-label="Curbio — visit curbio.com">
            <Image
              src="/logo/curbio-white.svg"
              alt="Curbio"
              width={500}
              height={130}
              priority
              unoptimized
              className="lp-header-logo"
            />
          </a>
          <span className="exp-header-divider" aria-hidden />
          <Image
            src={EXP_PARTNER.logoPath}
            alt="eXp Solutions"
            width={470}
            height={95}
            unoptimized
            className="exp-solutions-logo"
          />
        </div>
        <PillButton size="sm" href="#lead-form" icon="arrow">
          Get your free estimate
        </PillButton>
      </div>
    </header>
  );
}

// ── Hero ──
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
          {/* eXp Trusted Provider badge — required by eXp brand guidelines */}
          <div className="exp-badge-eyebrow">
            <Image
              src={EXP_PARTNER.badgePath!}
              alt="eXp Solutions Trusted Provider"
              width={500}
              height={500}
              unoptimized
              className="exp-badge-img"
            />
            <span className="exp-badge-label">An official eXp Solution</span>
          </div>
          <h1 className="lp-hero-h1">
            You make the <em>sale.</em>
            <br />
            We do the <em>work.</em>
            <br />
            Your seller pays <em>at close.</em>
          </h1>
          <AmberRule width={48} style={{ margin: "22px 0" }} />
          <p className="lp-hero-sub">
            Move-in ready sells. Curbio gets your eXp listings market-ready
            before they hit the market — and qualified sellers pay nothing until
            the home closes.
          </p>
          <div className="lp-hero-trust">
            <span className="lp-sold-proof">
              <Icon name="check" size={12} color="var(--fg-muted)" stroke={2.5} />
              Pay at closing
            </span>
            <span className="lp-sold-proof-dot" aria-hidden>·</span>
            <span className="lp-sold-proof">
              <Icon name="home" size={12} color="var(--fg-muted)" stroke={2} />
              8,000+ homes prepped
            </span>
            <span className="lp-sold-proof-dot" aria-hidden>·</span>
            <span className="lp-sold-proof">
              <Icon name="shield" size={12} color="var(--fg-muted)" stroke={2} />
              1-year warranty
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

// ── Trusted Provider strip (sage) ──
function ExpTrustStrip() {
  return (
    <aside className="exp-trust-strip">
      <div className="lp-shell exp-trust-strip-inner">
        <p className="exp-trust-strip-text">
          <strong>Curbio is a Trusted Provider in the eXp Solutions program</strong>
          {" "}— vetted and recommended to eXp agents, so you know it&apos;s a
          sanctioned eXp Solution, not a cold vendor.
        </p>
      </div>
    </aside>
  );
}

// ── How it works ──
const EXP_STEPS = [
  {
    icon: "clipboardCheck",
    title: "We walk the property.",
    body: "A local Curbio manager builds a full prep plan — what to fix, what to skip, and what moves the needle.",
  },
  {
    icon: "wrench",
    title: "We do the work.",
    body: "Paint, repairs, staging — managed end to end. One team, one timeline, with full-service project management.",
  },
  {
    icon: "dollar",
    title: "Seller pays at close.",
    body: "Nothing due upfront. Qualified sellers pay from proceeds when the home sells — subject to credit approval.",
  },
];

function ExpHowItWorks() {
  return (
    <section className="lp-how" id="how">
      <div className="lp-shell">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Eyebrow style={{ color: "var(--fg-muted)", marginBottom: 10 }}>
            From start to finish
          </Eyebrow>
          <h2 className="exp-section-h" style={{ margin: 0 }}>How it works</h2>
        </div>
        <ol className="lp-how-steps">
          {EXP_STEPS.map((s) => (
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

// ── Sold proof strip — "Prepped by Curbio. Sold by eXp agents." ──
function ExpSoldProofStrip({ market }: { market: CampaignMarket }) {
  return (
    <section className="lp-sold" id="sold">
      <div className="lp-shell">
        <Eyebrow style={{ textAlign: "center", color: "var(--fg-muted)" }}>
          Prepped by Curbio. Sold by eXp agents.
        </Eyebrow>
        <ul className="lp-sold-row">
          {market.sold.map((p) => (
            <li className="lp-sold-card" key={p.neighborhood}>
              <div className={"lp-sold-photo" + (p.photo ? "" : " lp-ph lp-ph-warm")} aria-hidden>
                {p.photo && (
                  <Image
                    src={p.photo}
                    alt={`${p.neighborhood} home prepped by Curbio`}
                    fill
                    sizes="(max-width: 520px) 78vw, (max-width: 860px) 64vw, 230px"
                    style={{ objectFit: "cover" }}
                  />
                )}
                <span className="lp-sold-pill">
                  <Icon name="check" size={12} color="#fff" stroke={2.5} /> Sold
                </span>
              </div>
              <div className="lp-sold-body">
                <span className="lp-sold-hood">{p.neighborhood}</span>
                {p.price && <span className="lp-sold-price">{p.price}</span>}
              </div>
            </li>
          ))}
        </ul>
        {/* Testimonial */}
        <blockquote className="exp-testimonial">
          <p className="exp-testimonial-quote">
            &ldquo;Our Curbio project manager was awesome to work with. Great
            communication, timely delivery of the work, and prompt to come back
            for minor touch-ups upon request.&rdquo;
          </p>
          <footer className="exp-testimonial-byline">
            <Icon name="check" size={13} color="var(--teal)" stroke={2.5} />
            <strong>Chris McNamara</strong>
            <span className="exp-testimonial-role">eXp Realty agent</span>
          </footer>
        </blockquote>
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
        <ExpTrustStrip />
        <ExpHowItWorks />
        <ExpSoldProofStrip market={market} />
        <Closer ctaCopy={ctaCopy} />
      </main>
    </>
  );
}
