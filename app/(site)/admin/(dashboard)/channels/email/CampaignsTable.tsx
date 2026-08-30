"use client";

import { HealthDot } from "@/app/(site)/admin/_ui/v2/HealthDot";
import { OpsCard } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { Table, Td, Th, Thead, Tr } from "@/app/(site)/admin/_ui/v2/DataTable";
import type { EmailCampaign } from "@/config/emailCampaigns";

const platformLabels: Record<string, string> = {
  activecampaign: "AC · opt-in",
  instantly: "Instantly · cold",
  mailchimp: "Mailchimp · archived",
};

export function CampaignsTable({
  campaigns,
  lastSync,
}: {
  campaigns: EmailCampaign[];
  lastSync: string | null;
}) {
  if (campaigns.length === 0) {
    return (
      <OpsCard title="Campaigns" titleTooltip={lastSync ? `Last sync: ${lastSync}` : undefined}>
        <div className="text-ops-text-secondary text-sm">No campaigns synced yet.</div>
      </OpsCard>
    );
  }

  return (
    <OpsCard
      title="Campaigns"
      titleTooltip={`Per-platform campaign metrics and engagement.${lastSync ? ` Last sync: ${lastSync}` : ""}`}
    >
      <Table>
        <Thead>
          <Th>Campaign</Th>
          <Th>Platform</Th>
          <Th align="right">Sent</Th>
          <Th align="right">Engagement</Th>
          <Th align="right">Qualified</Th>
          <Th align="right">CAC</Th>
          <Th align="right">Health</Th>
        </Thead>
        <tbody>
          {campaigns.map((campaign) => {
            const engagementRate =
              campaign.sent_count > 0
                ? (
                    ((campaign.open_count_unique + campaign.click_count_unique) /
                      campaign.sent_count) *
                    100
                  ).toFixed(1) + "%"
                : "—";

            return (
              <Tr key={campaign.id}>
                <Td className="font-semibold">{campaign.campaign_name}</Td>
                <Td className="text-ops-text-secondary text-sm">
                  {platformLabels[campaign.platform] || campaign.platform}
                </Td>
                <Td align="right" numeric>
                  {campaign.sent_count.toLocaleString("en-US")}
                </Td>
                <Td align="right" numeric>
                  {engagementRate}
                </Td>
                <Td align="right" numeric className="text-ops-text-secondary">
                  —
                </Td>
                <Td align="right" numeric className="text-ops-text-secondary">
                  —
                </Td>
                <Td align="right">
                  <HealthDot tooltip="Deliverability data not yet available" />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </OpsCard>
  );
}
