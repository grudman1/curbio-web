import Image from "next/image";
import { Icon, Eyebrow, AmberRule, PillButton } from "./LpKit";
import { ZipModalTrigger } from "./ZipModalTrigger";
import { FormCard } from "./FormCard";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CtaVariant } from "@/lib/ctaVariant";

// Re-export extracted client components so existing importers keep working.
export { StickyBar } from "./StickyBar";
export { WaitlistPage } from "./WaitlistPage";

// ── Header (chrome) ──
export function Header({
  market,
  neutral = false,
  initialPickerOpen = false,
  logoHref = "/",
}: {
  market: CampaignMarket;
  neutral?: boolean;
  initialPickerOpen?: boolean;
  /** Where the top-left Curbio logo links. Defaults to "/" (internal). Use an
   *  absolute URL on partner pages where the logo should return to curbio.com. */
  logoHref?: string;
}) {
  const pillLabel = neutral ? "Choose your market" : market.name;
  return (
    <header className="lp-header">
      <div className="lp-shell lp-header-inner">
        <a href={logoHref} aria-label="Curbio — return to home">
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
        <ZipModalTrigger
          label={pillLabel}
          marketSlug={neutral ? null : market.slug}
          initialOpen={initialPickerOpen}
        />
      </div>
    </header>
  );
}

// ── a. Hero ──
export function Hero({
  market,
  crmMarketName = null,
  neutral = false,
  variant,
  ctaCopy,
  prefillName,
  prefillEmail,
  eyebrowContent,
  heroSub,
  referralSourceId,
  source,
  showZip = false,
  partnerSlug,
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  neutral?: boolean;
  variant: CtaVariant;
  ctaCopy: string;
  prefillName?: string;
  prefillEmail?: string;
  /** Replaces the default "[Market] agents" eyebrow. Pass any React node. */
  eyebrowContent?: React.ReactNode;
  /** Replaces the default hero subheader paragraph. */
  heroSub?: React.ReactNode;
  /** Forwarded to FormCard — override referralSourceId for partner pages. */
  referralSourceId?: string;
  /** Forwarded to FormCard — override lead source string for partner pages. */
  source?: string;
  /** Forwarded to FormCard — show a ZIP field. */
  showZip?: boolean;
  /** Forwarded to FormCard — carried to /confirm so partner branding shows there too. */
  partnerSlug?: string;
}) {
  return (
    <section className="lp-hero" id="hero">
      <div className="lp-shell lp-hero-grid">
        <div className="lp-hero-copy">
          {eyebrowContent ?? (
            <Eyebrow style={{ marginBottom: 18, color: "var(--fg-muted)" }}>
              {neutral ? "For listing agents" : `${market.name} agents`}
            </Eyebrow>
          )}
          <h1 className="lp-hero-h1">
            We do the <em>prep.</em>
            <br />
            You make the <em>sale.</em>
            <br />
            Seller pays <em>at close.</em>
          </h1>
          <AmberRule width={48} style={{ margin: "22px 0" }} />
          <p className="lp-hero-sub">
            {heroSub ?? "Move-in ready sells. Your seller pays nothing until it closes."}
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
            prefillName={prefillName}
            prefillEmail={prefillEmail}
            referralSourceId={referralSourceId}
            source={source}
            showZip={showZip}
            partnerSlug={partnerSlug}
          />
        </div>
      </div>
    </section>
  );
}

// ── b. Sold-proof strip ──
export function SoldProofStrip({
  market,
  soldByLine,
}: {
  market: CampaignMarket;
  /** Replaces "Sold by {market.name} REALTORS®". Pass any React node. */
  soldByLine?: React.ReactNode;
}) {
  return (
    <section className="lp-sold" id="sold">
      <div className="lp-shell">
        <Eyebrow style={{ textAlign: "center", color: "var(--fg-muted)" }}>
          Prepped by Curbio.{" "}
          {soldByLine ?? <>Sold by {market.name} REALTORS&reg;</>}
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

// ── How it works ──
const STEPS = [
  {
    icon: "clipboardCheck",
    title: "We walk the property.",
    body: "A local Curbio manager builds a full prep plan — what to fix, what to skip, and what moves the needle.",
  },
  {
    icon: "wrench",
    title: "We do the work.",
    body: "Paint, repairs, staging. One team, one timeline.",
  },
  {
    icon: "dollar",
    title: "Seller pays at close.",
    body: "Nothing due upfront. Qualified sellers pay from proceeds when the home sells.",
  },
];

export function HowItWorks() {
  return (
    <section className="lp-how" id="how">
      <div className="lp-shell">
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
          One listing. You&apos;ll wonder <em>why you waited.</em>
        </h2>
        <div className="lp-closer-cta">
          {/* href="#quote-form" — native anchor scroll, no JS needed */}
          <PillButton size="lg" icon="arrow" href="#quote-form">
            {ctaCopy}
          </PillButton>
        </div>
      </div>
    </section>
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
