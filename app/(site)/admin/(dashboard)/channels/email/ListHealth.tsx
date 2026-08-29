// "List health by market" — the Email channel page's view of the Mailchimp
// audience summary. NOT attribution: these numbers never join to leads or
// Qualified counts (see config/emailListHealth.ts). Markets with no audience
// (Seattle, Riverside) are listed as exactly that — absent, not zero.
//
// The paragraph that used to say both of those things is gone. The
// engagement-not-attribution caveat rides on the card title's tooltip, and the
// markets without an audience are a muted row of the table rather than a
// sentence under it — they are data about the audience list, so they belong in
// the list.

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
      title="List health by market"
      titleTooltip={`Lifetime · Mailchimp export ${EMAIL_LIST_HEALTH_AS_OF} · engagement, not attribution — never counts toward Qualified.`}
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
          {noAudience.length > 0 && (
            <Tr>
              <Td
                muted
                colSpan={6}
                className="cursor-help"
                // Absent, not zero: no Mailchimp audience exists for these
                // markets, so there is nothing to rate.
              >
                <span title="No Mailchimp audience exists for these markets — absent, not zero.">
                  No audience · {noAudience.map((m) => m.label).join(" · ")}
                </span>
              </Td>
            </Tr>
          )}
        </tbody>
      </Table>
    </OpsCard>
  );
}
