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
}: {
  partnerId: string;
  market: CampaignMarket;
  neutral: boolean;
  initialPickerOpen: boolean;
  basePath: string;
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
        <ZipModalTrigger
          label={neutral ? "Choose your market" : market.name}
          marketSlug={neutral ? null : market.slug}
          initialOpen={initialPickerOpen}
          basePath={basePath}
        />
      </div>
    </header>
  );
}
