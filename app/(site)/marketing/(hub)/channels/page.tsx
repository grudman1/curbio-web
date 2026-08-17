import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { HubPageHeader, NeedsBlock } from "../hubUi";

export const metadata: Metadata = {
  title: "Channels · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.channels;

export default function ChannelsPage() {
  return (
    <>
      <HubPageHeader surface={surface} />
      <NeedsBlock surface={surface} />
    </>
  );
}
