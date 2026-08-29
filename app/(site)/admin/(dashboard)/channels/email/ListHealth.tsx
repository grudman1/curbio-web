// "List health by market" — the Email channel page's view of the Mailchimp
// audience summary. NOT attribution: these numbers never join to leads or
// Qualified counts (see config/emailListHealth.ts). Markets with no audience
// (Seattle, Riverside) are listed as exactly that — absent, not zero.

import { EMAIL_LIST_HEALTH, EMAIL_LIST_HEALTH_AS_OF } from "@/config/emailListHealth";
import { REPORTING_MARKETS } from "@/config/market-map";
import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { Eyebrow } from "@/app/(site)/admin/_ui/primitives";

const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

export function EmailListHealth() {
  const covered = new Set(EMAIL_LIST_HEALTH.map((a) => a.reportingMarket));
  const noAudience = REPORTING_MARKETS.filter((m) => m.active && !covered.has(m.code));

  return (
    <div className="mt-5">
      <Eyebrow className="mb-2 block">
        List health by market · lifetime · Mailchimp export {EMAIL_LIST_HEALTH_AS_OF}
      </Eyebrow>
      <div className="max-w-[720px] overflow-x-auto rounded-md border border-app-border">
        <Table>
          <thead>
            <tr>
              <Th>Audience</Th>
              <Th align="right">Sent</Th>
              <Th align="right">Delivery</Th>
              <Th align="right">Open (MPP-excl.)</Th>
              <Th align="right">Click</Th>
              <Th align="right">Unsub</Th>
            </tr>
          </thead>
          <tbody>
            {EMAIL_LIST_HEALTH.map((a) => (
              <Tr key={a.audience}>
                <Td className="font-semibold">{a.audience}</Td>
                <Td align="right" className="tabular-nums">{a.emailsSent.toLocaleString("en-US")}</Td>
                <Td align="right" className="tabular-nums">{pct(a.deliveryRate)}</Td>
                <Td align="right" className="tabular-nums">{pct(a.openRate)}</Td>
                <Td align="right" className="tabular-nums">{pct(a.clickRate)}</Td>
                <Td align="right" className="tabular-nums">{pct(a.unsubscribeRate, 2)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      {noAudience.length > 0 && (
        <p className="m-0 mt-2 font-sans text-ops-label leading-[1.6] text-content-subtle">
          {noAudience.map((m) => m.label).join(" and ")} have no Mailchimp audience — absent, not
          zero. List health is engagement, not attribution; it never counts toward Qualified.
        </p>
      )}
    </div>
  );
}
