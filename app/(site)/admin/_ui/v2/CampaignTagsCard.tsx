import type { AutoDocumentedCampaign } from "@/lib/campaignAutoDoc";
import type { CampaignOrphan } from "@/lib/campaignOrphans";
import { OpsCard } from "./OpsCard";
import { Table, Thead, Th, Tr, Td } from "./DataTable";
import { StatusBadge } from "./HealthDot";

// ─────────────────────────────────────────────────────────────────────────────
// Campaign tags seen in lead traffic that no Links-registry row documents.
//
// This replaces the prose banner ("15 campaign tags auto-documented from lead
// traffic — awaiting review ... easytip-jul (7 leads, email) · ..."), which
// was a table serialized into a paragraph. Now it is the table. The
// methodology sentence ("computed against the last N leads plus the app
// snapshot") and the QA-exclusion count ride on the card title's tooltip —
// facts on hover, never standing text.
//
// Row vocabulary:
//   undocumented   an orphan — a tag nobody can even describe. Error tone.
//   auto           described from its own traffic, awaiting review. Neutral.
//   placeholder    the tag still contains an unsubstituted template token
//                  ("MARKET-jun26") — mis-tagged at the source. Warning tone.
// ─────────────────────────────────────────────────────────────────────────────

export function CampaignTagsCard({
  orphans,
  autoDocumented,
  testTags,
  leadWindow,
}: {
  orphans: CampaignOrphan[];
  autoDocumented: AutoDocumentedCampaign[];
  testTags: CampaignOrphan[];
  leadWindow: number;
}) {
  if (orphans.length === 0 && autoDocumented.length === 0) return null;

  const excluded =
    testTags.length > 0
      ? ` ${testTags.length} QA test tag${testTags.length === 1 ? "" : "s"} excluded: ${testTags
          .map((t) => t.campaign)
          .join(", ")}.`
      : "";

  return (
    <OpsCard
      title="Undocumented campaign tags"
      titleTooltip={`Tags producing leads with no Links-registry row. Computed against the last ${leadWindow} leads plus the app snapshot, at page load. Channel and market are inferred from the leads themselves, not authored — confirm or correct each row in Links.${excluded}`}
      headerHref="/admin/site/links"
      className="mb-4"
    >
      <Table>
        <Thead>
          <Th>Campaign tag</Th>
          <Th align="right">Leads</Th>
          <Th>Channel</Th>
          <Th>Market</Th>
          <Th>Status</Th>
        </Thead>
        <tbody>
          {orphans.map((o) => (
            <Tr key={`orphan-${o.campaign}`}>
              <Td className="font-mono text-[12.5px]">{o.campaign}</Td>
              <Td align="right" numeric>
                {o.count}
              </Td>
              <Td muted>—</Td>
              <Td muted>—</Td>
              <Td>
                <StatusBadge
                  status="undocumented"
                  tone="error"
                  title="Producing leads and nothing can describe it — document it in Links, or fix the link emitting it."
                />
              </Td>
            </Tr>
          ))}
          {autoDocumented.map((c) => (
            <Tr key={`auto-${c.campaign}`}>
              <Td className="font-mono text-[12.5px]">{c.campaign}</Td>
              <Td align="right" numeric>
                {c.leadCount}
              </Td>
              <Td title={c.channelBasis}>{c.channel}</Td>
              <Td muted>{c.markets.length ? c.markets.join(", ") : "—"}</Td>
              <Td>
                {c.placeholder ? (
                  <StatusBadge
                    status="placeholder"
                    tone="warning"
                    title="The tag still contains an unsubstituted template token — the link that produced these leads is mis-tagged at the source."
                  />
                ) : (
                  <StatusBadge
                    status="auto"
                    tone="neutral"
                    title={`Auto-documented from lead traffic, awaiting review. First seen ${c.firstSeen ?? "unknown"}.`}
                  />
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </OpsCard>
  );
}
