import { CHANNEL_PLAN_BY_SLUG } from "@/config/channelPlan";
import { MESSAGING_BANK } from "@/config/messagingBank";
import { CONTENT_REGISTRY } from "@/config/contentRegistry";
import { PageHeader } from "@/app/(site)/admin/_ui/v2/PageHeader";
import { ChannelTierBadge, ChannelChips } from "@/app/(site)/admin/_ui/ChannelBrief";
import { HealthList, type HealthItem } from "@/app/(site)/admin/_ui/v2/HealthDot";
import { MessagingBankTable } from "./MessagingBankTable";
import { PublishedTable } from "./PublishedTable";
import { InFlightTable } from "./InFlightTable";

export const dynamic = "force-dynamic";

export default function ContentPage() {
  const plan = CHANNEL_PLAN_BY_SLUG["content"];
  if (!plan) return null;

  const needs: HealthItem[] = plan.needs.map((need) => ({
    label: shortLabel(need),
    tooltip: need,
  }));

  return (
    <>
      <PageHeader
        title={plan.label}
        badge={<ChannelTierBadge plan={plan} />}
        right={<ChannelChips plan={plan} />}
      />

      {/* Messaging bank — primary surface */}
      <div className="mt-6">
        <MessagingBankTable entries={MESSAGING_BANK} />
      </div>

      {/* Published content */}
      <div className="mt-6">
        <PublishedTable entries={CONTENT_REGISTRY} />
      </div>

      {/* In-flight drafts */}
      <div className="mt-6">
        <InFlightTable />
      </div>

      {/* Health items */}
      {needs.length > 0 && (
        <div className="mt-5">
          <HealthList items={needs} />
        </div>
      )}
    </>
  );
}

function shortLabel(need: string): string {
  const clause = need.split(/[—:(]/)[0].trim();
  const words = clause.split(/\s+/);
  const cut = words.length <= 5 ? words : words.slice(0, 5);
  while (
    cut.length > 1 &&
    /^(and|or|per|of|the|a|by|for|with|to|in|on|×|x|\+|&)$/i.test(cut[cut.length - 1])
  ) {
    cut.pop();
  }
  return cut.join(" ");
}
