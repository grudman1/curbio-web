import type { Metadata } from "next";
import { ChannelScreen } from "../channelScreen";
import { EmailListHealth } from "./ListHealth";

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
  return (
    <ChannelScreen slug="email" searchParams={searchParams}>
      <EmailListHealth />
    </ChannelScreen>
  );
}
