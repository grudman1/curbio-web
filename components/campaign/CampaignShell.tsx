"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Header, Hero, SoldProofStrip, HowItWorks, Closer } from "../LpSections";
import { StickyBar } from "../StickyBar";
import { Eyebrow } from "../LpKit";
import { RichText, interpolate } from "./RichText";
import { PartnerHeader } from "./PartnerHeader";
import { PARTNERS } from "@/lib/partners";
import { CTA_COPY, readVariantFromCookie, type CtaVariant } from "@/lib/ctaVariant";
import { useCampaignBase } from "@/lib/campaignBase";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CampaignPage } from "@/config/campaigns/types";

// ─────────────────────────────────────────────────────────────────────────────
// THE campaign template. Singular.
//
// Every campaign page — and every partner page — is this component plus a
// config object. There is no per-page component and there must never be one:
// the moment one page gets its own shell, the shared spine (form, attribution,
// confirm handoff, tracking) starts drifting page by page, which is the exact
// failure the market lists just demonstrated at a smaller scale.
//
// The TIER is not this component's business. /lp/<name> mounts it in the
// campaign tier (never indexed); /exp mounts it in the site tier (indexable at
// cutover). Indexability comes from config/routes.ts, keyed on the route — so
// no campaign config can make a page indexable, which is the point.
// ─────────────────────────────────────────────────────────────────────────────

/** Partner co-brand lockup — replaces the eyebrow on partner pages. */
function CoBrandMark({
  partnerId,
  market,
  neutral,
}: {
  partnerId: string;
  market: CampaignMarket;
  neutral: boolean;
}) {
  const partner = PARTNERS[partnerId];
  if (!partner?.badgePathDark) return null;
  const serving = neutral
    ? partner.coBrand.servingLine.neutral
    : interpolate(partner.coBrand.servingLine.default, { market: market.name });

  return (
    <div className="exp-cobrand-mark">
      <Image
        src={partner.badgePathDark}
        alt={partner.coBrand.badgeAlt}
        width={500}
        height={500}
        unoptimized
        className="exp-cobrand-seal"
      />
      <div className="exp-cobrand-text">
        <span className="exp-cobrand-serving">{serving}</span>
        <span className="exp-cobrand-title">
          <RichText>{partner.coBrand.title}</RichText>
        </span>
      </div>
    </div>
  );
}

export default function CampaignShell({
  page,
  market,
  crmMarketName = null,
  neutral = false,
  showPicker = false,
  variant: serverVariant,
}: {
  page: CampaignPage;
  market: CampaignMarket;
  crmMarketName?: string | null;
  neutral?: boolean;
  showPicker?: boolean;
  /**
   * EDGE PATH only. Set by the /v/<variant> routes, where middleware already
   * bucketed the visitor and served the matching prerendered HTML. Passing it
   * disables the client-side swap below entirely — that swap is precisely the
   * flash the edge path exists to remove. Omit for the client path.
   * See lib/ctaVariant.ts, "THE TWO DELIVERY PATHS".
   */
  variant?: CtaVariant;
}) {
  // CLIENT PATH: bucketed from the curbio_vid cookie after hydration, because
  // this renders on prerendered pages — one HTML for every visitor, so the
  // server cannot know the bucket. Control until hydration, then swap.
  const [clientVariant, setClientVariant] = useState<CtaVariant>("control");
  useEffect(() => {
    // Never run on the edge path: the HTML is already the right variant, and
    // re-reading the cookie could only reintroduce a swap.
    if (serverVariant) return;
    setClientVariant(readVariantFromCookie());
  }, [serverVariant]);
  const variant = serverVariant ?? clientVariant;

  // A config `cta` overrides the running experiment; omitting it keeps the
  // experiment intact, which is why /lp/sell does not set one.
  const ctaCopy = page.cta ?? CTA_COPY[variant];

  // "/" on the live host, the physical prefix only when served at the QA path.
  const base = useCampaignBase();

  const marketName = neutral ? "" : market.name;
  const marketSlug = market.slug || "unknown";
  const fill = (t: string) => interpolate(t, { market: marketName });

  const partnerId = page.partner;
  const partner = partnerId ? PARTNERS[partnerId] : undefined;

  // Non-partner eyebrows keep the <Eyebrow> wrapper and its exact inline style.
  // Passing bare text here silently dropped that wrapper and unstyled the line
  // on every owned page — caught by the DOM diff, invisible to the eye.
  const eyebrow = partnerId ? (
    <CoBrandMark partnerId={partnerId} market={market} neutral={neutral} />
  ) : (
    <Eyebrow style={{ marginBottom: 18, color: "var(--fg-muted)" }}>
      <RichText>{neutral ? page.hero.eyebrow.neutral : fill(page.hero.eyebrow.default)}</RichText>
    </Eyebrow>
  );

  return (
    <>
      {partnerId ? (
        <PartnerHeader
          partnerId={partnerId}
          market={market}
          neutral={neutral}
          initialPickerOpen={showPicker}
          basePath={base}
          showMarketPicker={page.market.mode === "picker"}
        />
      ) : (
        <Header
          market={market}
          neutral={neutral}
          initialPickerOpen={showPicker}
          logoHref={base}
          basePath={base}
          showMarketPicker={page.market.mode === "picker"}
        />
      )}

      <main>
        <Hero
          market={market}
          crmMarketName={crmMarketName}
          neutral={neutral}
          variant={variant}
          ctaCopy={ctaCopy}
          eyebrowContent={eyebrow}
          headline={<RichText>{fill(page.hero.headline)}</RichText>}
          trust={page.hero.trust}
          heroSub={<RichText>{fill(page.hero.sub)}</RichText>}
          referralSourceId={page.attribution.referralSourceId ?? partner?.referralSourceId}
          partnerSlug={partnerId}
          showZip={page.showZip ?? false}
          zipLabel={page.zipLabel}
          defaultUtmSource={page.attribution.defaultUtmSource}
          source={page.attribution.source.replace(/\{marketSlug\}/g, marketSlug)}
        />

        {/* A market with no verified listings renders no strip at all, rather
            than an empty row under a "Prepped by Curbio" eyebrow. Gated on the
            DATA, not on a slug — see Market.placeholder in config/markets.ts. */}
        {page.sections.soldProof && !neutral && market.sold.length > 0 && (
          <SoldProofStrip
            market={market}
            soldByLine={
              page.sections.soldByLine ? (
                <RichText>{fill(page.sections.soldByLine)}</RichText>
              ) : undefined
            }
          />
        )}

        {page.sections.howItWorks && <HowItWorks />}

        {page.sections.closer !== false && (
          <Closer
            ctaCopy={ctaCopy}
            marketSlug={market.slug}
            headline={<RichText>{fill(page.sections.closer)}</RichText>}
          />
        )}
      </main>

      {/* Conversion-affecting, so OFF unless a config opts in. /lp/sell does
          not, which is why its output is unchanged. */}
      {page.stickyBar && <StickyBar ctaCopy={ctaCopy} marketSlug={market.slug} />}
    </>
  );
}
