import Image from "next/image";
import { Hero, SoldProofStrip, HowItWorks, Closer } from "./LpSections";
import { ZipModalTrigger } from "./ZipModalTrigger";
import { EXP_PARTNER } from "@/lib/partners";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CtaVariant } from "@/lib/flags";

// ── Co-branded header: Curbio + eXp Solutions logo (left), market picker (right) ──
export function ExpHeader({
  market,
  neutral = false,
  initialPickerOpen = false,
}: {
  market: CampaignMarket;
  neutral?: boolean;
  initialPickerOpen?: boolean;
}) {
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
        <ZipModalTrigger
          label={neutral ? "Choose your market" : market.name}
          marketSlug={neutral ? null : market.slug}
          initialOpen={initialPickerOpen}
          basePath="/exp"
        />
      </div>
    </header>
  );
}

// ── Hero co-brand mark: large seal + text lockup ──
function ExpCoBrandMark({ market, neutral }: { market: CampaignMarket; neutral: boolean }) {
  return (
    <div className="exp-cobrand-mark">
      <Image
        src={EXP_PARTNER.badgePathDark!}
        alt="eXp Solutions Trusted Provider"
        width={500}
        height={500}
        unoptimized
        className="exp-cobrand-seal"
      />
      <div className="exp-cobrand-text">
        <span className="exp-cobrand-serving">
          {neutral ? "For eXp agents" : `Serving ${market.name}`}
        </span>
        <span className="exp-cobrand-title">
          eXp Realty<br />Trusted Provider
        </span>
      </div>
    </div>
  );
}

// ── Shell — thin wrapper over shared sections ──
export default function ExpShell({
  market,
  crmMarketName = null,
  neutral = false,
  showPicker = false,
  variant,
  ctaCopy,
  prefillName = "",
  prefillEmail = "",
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  neutral?: boolean;
  showPicker?: boolean;
  variant: CtaVariant;
  ctaCopy: string;
  prefillName?: string;
  prefillEmail?: string;
}) {
  return (
    <>
      <ExpHeader market={market} neutral={neutral} initialPickerOpen={showPicker} />
      <main>
        <Hero
          market={market}
          crmMarketName={crmMarketName}
          neutral={neutral}
          variant={variant}
          ctaCopy={ctaCopy}
          prefillName={prefillName}
          prefillEmail={prefillEmail}
          eyebrowContent={<ExpCoBrandMark market={market} neutral={neutral} />}
          referralSourceId={EXP_PARTNER.referralSourceId}
          source={`exp-realty-${market.slug || "unknown"}`}
        />
        {!neutral && (
          <SoldProofStrip
            market={market}
            soldByLine={
              <>
                <span style={{ color: "var(--amber)" }}>Sold by eXp agents</span>
                {" "}in {market.name}.
              </>
            }
          />
        )}
        <HowItWorks />
        <Closer ctaCopy={ctaCopy} />
      </main>
    </>
  );
}
