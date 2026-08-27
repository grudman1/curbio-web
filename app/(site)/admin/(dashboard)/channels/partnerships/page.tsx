import type { Metadata } from "next";
import { ChannelScreen } from "../channelScreen";

export const metadata: Metadata = {
  title: "Partnerships · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  return <ChannelScreen slug="partnerships" searchParams={searchParams} />;
}
