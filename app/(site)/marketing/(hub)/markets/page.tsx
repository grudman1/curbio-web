import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { HubPageHeader, NeedsBlock } from "../hubUi";

export const metadata: Metadata = {
  title: "Markets · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.markets;

export default function MarketsPage() {
  return (
    <>
      <HubPageHeader surface={surface} />
      <NeedsBlock surface={surface} />
    </>
  );
}
