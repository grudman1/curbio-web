import type { Metadata } from "next";
import { CHANNEL_PLAN, CHANNEL_PLAN_BY_SLUG } from "@/config/channelPlan";
import { EventLogPanel } from "@/app/(site)/marketing/(hub)/events/EventLogPanel";
import { ChannelScreen } from "../channelScreen";

// One route, every Magnificent Seven channel except Partnerships, which has
// its own static route because it carries tabs.
//
// A channel with a WORKING SURFACE renders it under the brief. Events is the
// one that has one today (the event log) — opsActionUtils already revalidates
// /admin/channels/events on every event write, which is what that route is
// for. Everything else is brief-only until its surface exists.

export function generateStaticParams() {
  return CHANNEL_PLAN.filter((c) => c.slug !== "partnerships").map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${CHANNEL_PLAN_BY_SLUG[slug]?.label ?? "Channel"} · Ops — Curbio`,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const { slug } = await params;
  return (
    <ChannelScreen slug={slug} searchParams={searchParams}>
      {slug === "events" && <EventLogPanel />}
    </ChannelScreen>
  );
}
