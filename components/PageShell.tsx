"use client";

import { useCallback, useEffect, useState } from "react";
import { type ResolvedMarket } from "@/lib/markets";
import { Nav, MarketBar, Hero, SocialProof, Downloads, Proof, Closer, Footer } from "./LpSections";
import { QuoteModal, ZipModal } from "./LpModals";

type Modal = "quote" | "zip" | null;

export default function PageShell({
  market,
  source,
}: {
  market: ResolvedMarket | null;
  source: "param" | "zip" | "geo" | "none";
}) {
  const [modal, setModal] = useState<Modal>(null);
  const openQuote = useCallback(() => setModal("quote"), []);
  const openZip = useCallback(() => setModal("zip"), []);
  const close = useCallback(() => setModal(null), []);

  // Visitors who weren't directed to a market (no ?market=, no ZIP, no geo
  // match) are greeted with the market chooser so they can self-select.
  useEffect(() => {
    if (!market) {
      const t = setTimeout(() => setModal((m) => (m === null ? "zip" : m)), 700);
      return () => clearTimeout(t);
    }
  }, [market]);

  return (
    <>
      <Nav onQuote={openQuote} />
      <MarketBar market={market} source={source} onZip={openZip} />
      <main>
        <Hero market={market} onQuote={openQuote} onZip={openZip} />
        <SocialProof />
        <Downloads market={market} />
        <Proof />
        <Closer market={market} onQuote={openQuote} onZip={openZip} />
      </main>
      <Footer onZip={openZip} />

      <QuoteModal open={modal === "quote"} onClose={close} market={market} />
      <ZipModal open={modal === "zip"} onClose={close} current={market} />
    </>
  );
}
