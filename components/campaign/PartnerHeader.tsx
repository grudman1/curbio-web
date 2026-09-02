"use client";

import Image from "next/image";
import { ZipModalTrigger } from "../ZipModalTrigger";
import { PARTNERS } from "@/lib/partners";
import type { CampaignMarket } from "@/lib/campaignMarkets";

// Extracted so CampaignShell and ConfirmShell render the SAME co-branded
// header. It previously lived in ExpShell, which meant the confirm page
// imported a header from a page shell — the kind of coupling that leaves two
// partner headers drifting apart once there are fifty partners.

/** Co-branded header: Curbio logo + divider + partner logo, then the picker. */
export function PartnerHeader({
  partnerId,
  market,
  neutral,
  initialPickerOpen,
  basePath,
  showMarketPicker = true,
}: {
  partnerId: string;
  market: CampaignMarket;
  neutral: boolean;
  initialPickerOpen: boolean;
  basePath: string;
  /**
   * Mirrors the same prop on Header. A page with no market resolution
   * (`market: { mode: "none" }`) has nothing for the picker to set, and
   * offering one would imply a market choice the page does not make.
   * Defaults true so existing partner pages are unchanged.
   */
  showMarketPicker?: boolean;
}) {
  const partner = PARTNERS[partnerId];
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
            src={partner.logoPath}
            alt={partner.coBrand.logoAlt}
            width={470}
            height={95}
            unoptimized
            className="exp-solutions-logo"
          />
        </div>
        {showMarketPicker && (
          <ZipModalTrigger
            label={neutral ? "Choose your market" : market.name}
            marketSlug={neutral ? null : market.slug}
            initialOpen={initialPickerOpen}
            basePath={basePath}
          />
        )}
      </div>
    </header>
  );
}
