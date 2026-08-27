import type { Metadata } from "next";
import { CHANNEL_PLAN, CHANNEL_PLAN_BY_SLUG } from "@/config/channelPlan";
import { ChannelScreen } from "../channelScreen";

// One route, every Magnificent Seven channel except Partnerships, which has
// its own static route because it carries tabs.

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
  return <ChannelScreen slug={slug} searchParams={searchParams} />;
}
