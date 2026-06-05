"use client";

import { useCallback, useEffect, useState } from "react";
import { type ResolvedMarket } from "@/lib/markets";
import {
  Nav,
  Hero,
  Testimonials,
  Closer,
  Footer,
  WaitlistPage,
} from "./LpSections";
import { QuoteModal, ZipModal } from "./LpModals";

type Modal = "quote" | "zip" | null;

export default function PageShell({
  market,
  source,
  outZip,
  geoCity,
  geoRegion,
}: {
  market: ResolvedMarket | null;
  source: "param" | "zip" | "geo" | "out-of-area" | "none";
  outZip?: string;
  geoCity?: string;
  geoRegion?: string;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const openQuote = useCallback(() => setModal("quote"), []);
  const openZip = useCallback(() => setModal("zip"), []);
  const close = useCallback(() => setModal(null), []);

  useEffect(() => {
    if (!market && source !== "out-of-area") {
      const t = setTimeout(() => setModal((m) => (m === null ? "zip" : m)), 700);
      return () => clearTimeout(t);
    }
  }, [market, source]);

  // ── Out-of-area: waitlist page ─────────────────────────────────────────────
  if (source === "out-of-area") {
    return (
      <>
        <main>
          <WaitlistPage
            zip={outZip ?? ""}
            geoCity={geoCity}
            geoRegion={geoRegion}
            onChooseMarket={openZip}
          />
        </main>
        <Footer onZip={openZip} />
        <ZipModal open={modal === "zip"} onClose={close} current={null} />
      </>
    );
  }

  // ── Normal page ────────────────────────────────────────────────────────────
  return (
    <>
      <main>
        <Hero market={market} onQuote={openQuote} onZip={openZip} />
        <Testimonials />
        <Closer market={market} onQuote={openQuote} onZip={openZip} />
      </main>
      <Footer onZip={openZip} />

      <QuoteModal open={modal === "quote"} onClose={close} market={market} />
      <ZipModal open={modal === "zip"} onClose={close} current={market} />
    </>
  );
}
