import Image from "next/image";
import { FormCard } from "./FormCard";
import { HowItWorks, Closer } from "./LpSections";
import { Icon, Eyebrow, AmberRule } from "./LpKit";
import { EXP_PARTNER } from "@/lib/partners";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CtaVariant } from "@/lib/flags";

// ── Header — co-brand: Curbio + eXp Solutions logo + Trusted Provider badge ──
export function ExpHeader() {
  return (
    <header className="lp-header">
      <div className="lp-shell lp-header-inner">
        {/* Left: Curbio logo + divider + eXp Solutions logo */}
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
        {/* Right: Trusted Provider badge (required by eXp brand guidelines) */}
        <Image
          src={EXP_PARTNER.badgePath!}
          alt="eXp Solutions Trusted Provider"
          width={500}
          height={500}
          unoptimized
          className="exp-badge-header"
        />
      </div>
    </header>
  );
}

// ── Hero — identical to email page except eyebrow shows the eXp badge ──
function ExpHero({
  market,
  crmMarketName,
  neutral,
  variant,
  ctaCopy,
  prefillName,
  prefillEmail,
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  neutral?: boolean;
  variant: CtaVariant;
  ctaCopy: string;
  prefillName?: string;
  prefillEmail?: string;
}) {
  return (
    <section className="lp-hero" id="hero">
      <div className="lp-shell lp-hero-grid">
        <div className="lp-hero-copy">
          {/* eXp badge eyebrow replaces the "[Market] agents" text eyebrow */}
          <div className="exp-badge-eyebrow">
            <Image
              src={EXP_PARTNER.badgePath!}
              alt="eXp Solutions Trusted Provider"
              width={500}
              height={500}
              unoptimized
              className="exp-badge-img"
            />
            <span className="exp-badge-label">
              {neutral ? "For eXp Realty agents" : `${market.name} eXp agents`}
            </span>
          </div>
          {/* H1 identical to email page */}
          <h1 className="lp-hero-h1">
            We do the <em>prep.</em>
            <br />
            You make the <em>sale.</em>
            <br />
            Seller pays <em>at close.</em>
          </h1>
          <AmberRule width={48} style={{ margin: "22px 0" }} />
          <p className="lp-hero-sub">
            Move-in ready sells. Your seller pays nothing until it closes.
          </p>
          {/* Trust chips identical to email page */}
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
            prefillName={prefillName}
            prefillEmail={prefillEmail}
            referralSourceId={EXP_PARTNER.referralSourceId}
            source={`exp-realty-${market.slug || "unknown"}`}
            showZip
          />
        </div>
      </div>
    </section>
  );
}

// ── Sold proof strip — same layout, eXp eyebrow ──
function ExpSoldProofStrip({ market }: { market: CampaignMarket }) {
  return (
    <section className="lp-sold" id="sold">
      <div className="lp-shell">
        <Eyebrow style={{ textAlign: "center", color: "var(--fg-muted)" }}>
          Prepped by Curbio.{" "}
          <span style={{ color: "var(--amber)" }}>
            Sold by eXp agents
          </span>
          {" "}in {market.name}.
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
      </div>
    </section>
  );
}

// ── Shell ──
export default function ExpShell({
  market,
  crmMarketName = null,
  neutral = false,
  variant,
  ctaCopy,
  prefillName,
  prefillEmail,
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  neutral?: boolean;
  variant: CtaVariant;
  ctaCopy: string;
  prefillName?: string;
  prefillEmail?: string;
}) {
  return (
    <>
      <ExpHeader />
      <main>
        <ExpHero
          market={market}
          crmMarketName={crmMarketName}
          neutral={neutral}
          variant={variant}
          ctaCopy={ctaCopy}
          prefillName={prefillName}
          prefillEmail={prefillEmail}
        />
        <HowItWorks />
        <ExpSoldProofStrip market={market} />
        <Closer ctaCopy={ctaCopy} />
      </main>
    </>
  );
}
