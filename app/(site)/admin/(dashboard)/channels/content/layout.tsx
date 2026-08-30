import type { Metadata } from "next";
import { CHANNEL_PLAN_BY_SLUG } from "@/config/channelPlan";

export async function generateMetadata(): Promise<Metadata> {
  const plan = CHANNEL_PLAN_BY_SLUG["content"];
  return {
    title: `${plan?.label ?? "Content"} · Ops — Curbio`,
    robots: { index: false, follow: false },
  };
}

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
