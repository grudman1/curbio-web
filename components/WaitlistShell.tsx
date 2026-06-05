"use client";

import { useState } from "react";
import { Header, WaitlistPage } from "./LpSections";
import { ZipModal } from "./LpModals";
import { getCampaignMarket } from "@/lib/campaignMarkets";

export default function WaitlistShell({
  outZip,
  geoCity,
  geoRegion,
}: {
  outZip?: string;
  geoCity?: string;
  geoRegion?: string;
}) {
  const [zipOpen, setZipOpen] = useState(false);
  // Show default (Atlanta) in the header while on the waitlist page
  const defaultMarket = getCampaignMarket();

  return (
    <>
      <Header market={defaultMarket} onPickerClick={() => setZipOpen(true)} />
      <main>
        <WaitlistPage
          zip={outZip ?? ""}
          geoCity={geoCity}
          geoRegion={geoRegion}
          onChooseMarket={() => setZipOpen(true)}
        />
      </main>
      <ZipModal open={zipOpen} onClose={() => setZipOpen(false)} current={null} />
    </>
  );
}
