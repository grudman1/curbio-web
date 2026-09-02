import type { Metadata } from "next";
import { ChannelScreen } from "../channelScreen";
import { EmailListHealth } from "./ListHealth";
import { CampaignsTable } from "./CampaignsTable";
import { getAllCampaigns, getLastSyncTimestamp } from "@/config/emailCampaigns";

export const metadata: Metadata = {
  title: "Email · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const [campaigns, lastSync] = await Promise.all([
    getAllCampaigns(),
    getLastSyncTimestamp(),
  ]);

  return (
    <ChannelScreen slug="email" searchParams={searchParams}>
      <CampaignsTable campaigns={campaigns} lastSync={lastSync} />
      <EmailListHealth />
    </ChannelScreen>
  );
}
