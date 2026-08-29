import type { Metadata } from "next";
import { CHANNEL_PLAN, CHANNEL_PLAN_BY_SLUG } from "@/config/channelPlan";
import { EventLogPanel } from "@/app/(site)/marketing/(hub)/events/EventLogPanel";
import { ChannelScreen } from "../channelScreen";

// One route, every Magnificent Seven channel except Partnerships and Email,
// which have their own static routes because they carry tabs.
//
// A channel with a WORKING SURFACE renders it under the brief. Events is the
// one that has one today (the event log) — opsActionUtils already revalidates
// /admin/channels/events on every event write, which is what that route is
// for. Everything else is brief-only until its surface exists.

export function generateStaticParams() {
  return CHANNEL_PLAN.filter((c) => c.slug !== "partnerships" && c.slug !== "email").map((c) => ({
    slug: c.slug,
  }));
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
      {/* `undefined`, not `false`, when there is no surface — ChannelBrief
          renders an EmptyState for a channel that has none, and `false` would
          read as "a child was passed". */}
      {slug === "events" ? <EventLogPanel /> : undefined}
    </ChannelScreen>
  );
}
