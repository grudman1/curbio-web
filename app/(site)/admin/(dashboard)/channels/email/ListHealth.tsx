// "List health" — the Email channel page's view of the Mailchimp audience
// summary. NOT attribution: these numbers never join to leads or Qualified
// counts (see config/emailListHealth.ts).
//
// Everything that used to stand under or around the table is a title tooltip
// now: scope and provenance (by market · lifetime · export date), the
// engagement-not-attribution caveat, and which markets have no Mailchimp
// audience at all (absent, not zero). The table shows only audiences that
// exist.

import { EMAIL_LIST_HEALTH, EMAIL_LIST_HEALTH_AS_OF } from "@/config/emailListHealth";
import { REPORTING_MARKETS } from "@/config/market-map";
import { OpsCard } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { Table, Td, Th, Thead, Tr } from "@/app/(site)/admin/_ui/v2/DataTable";

const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

export function EmailListHealth() {
  const covered = new Set(EMAIL_LIST_HEALTH.map((a) => a.reportingMarket));
  const noAudience = REPORTING_MARKETS.filter((m) => m.active && !covered.has(m.code));

  return (
    <OpsCard
      title="List health"
      titleTooltip={`By market · lifetime · Mailchimp export ${EMAIL_LIST_HEALTH_AS_OF} · engagement, not attribution — never counts toward Qualified.${
        noAudience.length > 0
          ? ` No Mailchimp audience: ${noAudience.map((m) => m.label).join(", ")}.`
          : ""
      }`}
    >
      <Table>
        <Thead>
          <Th>Audience</Th>
          <Th align="right">Sent</Th>
          <Th align="right">Delivery</Th>
          <Th align="right">Open (MPP-excl.)</Th>
          <Th align="right">Click</Th>
          <Th align="right">Unsub</Th>
        </Thead>
        <tbody>
          {EMAIL_LIST_HEALTH.map((a) => (
            <Tr key={a.audience}>
              <Td className="font-semibold">{a.audience}</Td>
              <Td align="right" numeric>
                {a.emailsSent.toLocaleString("en-US")}
              </Td>
              <Td align="right" numeric>
                {pct(a.deliveryRate)}
              </Td>
              <Td align="right" numeric>
                {pct(a.openRate)}
              </Td>
              <Td align="right" numeric>
                {pct(a.clickRate)}
              </Td>
              <Td align="right" numeric>
                {pct(a.unsubscribeRate, 2)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </OpsCard>
  );
}
