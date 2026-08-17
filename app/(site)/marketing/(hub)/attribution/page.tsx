import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { HubPageHeader, NeedsBlock } from "../hubUi";

export const metadata: Metadata = {
  title: "Attribution health · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.attribution;

export default function AttributionPage() {
  return (
    <>
      <HubPageHeader surface={surface} />
      <NeedsBlock surface={surface} />
    </>
  );
}
