"use client";

import { useState } from "react";
import { Table, Thead, Th, Tr, Td } from "../../_ui/v2/DataTable";
import { StatusBadge } from "../../_ui/v2/HealthDot";

// ─────────────────────────────────────────────────────────────────────────────
// The lead feed table, with expandable rows. The summary row shows the
// operational read (received / name / market / source / campaign / delivery);
// clicking a row opens EVERYTHING the store holds for that lead — full
// attribution, detection, and the complete delivery record. Nothing about a
// lead is invisible; it's just one click deep.
//
// All values arrive PRE-FORMATTED as strings from the server component —
// identities are masked server-side, so raw PII never reaches this bundle.
// ─────────────────────────────────────────────────────────────────────────────

export type FeedDetailSection = {
  title: string;
  fields: { label: string; value: string; highlight?: "warn" | "fail" }[];
};

export type FeedRow = {
  id: string;
  received: string;
  name: string;
  market: string;
  source: string;
  campaign: string;
  deliveryLabel: string;
  deliveryTone: "ok" | "warn" | "fail" | "unknown";
  /** Why the delivery badge says what it says — hover only, never printed. */
  deliveryTitle?: string;
  unverified: boolean;
  detail: FeedDetailSection[];
};

/** The one place the delivery scale meets the ops badge tones. */
const BADGE_TONE = {
  ok: "success",
  warn: "warning",
  fail: "error",
  // A state we do not know never gets a colour.
  unknown: "neutral",
} as const;

function DetailField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "warn" | "fail";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="ops-eyebrow">{label}</span>
      <span
        className={`text-[13px] leading-[1.45] [overflow-wrap:anywhere] ${
          highlight === "fail"
            ? "font-semibold text-tone-bad"
            : highlight === "warn"
              ? "font-semibold text-tone-warn-text"
              : value === "—"
                ? "ops-subtle"
                : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function LeadFeedTable({ rows }: { rows: FeedRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Table>
      <Thead>
        <Th className="w-[28px]">{""}</Th>
        <Th>Received</Th>
        <Th>Name</Th>
        <Th>Market</Th>
        <Th>Source</Th>
        <Th>Campaign</Th>
        <Th>Delivery</Th>
      </Thead>
      <tbody>
        {rows.map((r) => {
          const isOpen = open === r.id;
          return (
            <LeadRow
              key={r.id}
              row={r}
              isOpen={isOpen}
              onToggle={() => setOpen(isOpen ? null : r.id)}
            />
          );
        })}
      </tbody>
    </Table>
  );
}

function LeadRow({
  row: r,
  isOpen,
  onToggle,
}: {
  row: FeedRow;
  isOpen: boolean;
  onToggle: () => void;
}) {
  // The whole row toggles; the chevron carries the button semantics so
  // keyboard and screen-reader users get a real control.
  return (
    <>
      <Tr onClick={onToggle}>
        <Td className="w-[28px] pr-1">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Collapse" : "Expand"} lead from ${r.name}, ${r.received}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`inline-block cursor-pointer border-0 bg-transparent p-0.5 text-[11px] leading-none transition-transform duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none ${
              isOpen ? "rotate-90" : ""
            }`}
          >
            ▶
          </button>
        </Td>
        <Td muted className="whitespace-nowrap">
          {r.received}
        </Td>
        <Td className="font-semibold">{r.name}</Td>
        <Td>{r.market}</Td>
        <Td>{r.source}</Td>
        <Td muted>{r.campaign}</Td>
        <Td className="whitespace-nowrap">
          <span className="inline-flex gap-1.5">
            <StatusBadge
              status={r.deliveryLabel}
              tone={BADGE_TONE[r.deliveryTone]}
              title={r.deliveryTitle}
            />
            {r.unverified && (
              <StatusBadge
                status="unverified"
                tone="warning"
                title="Referral source tag present but not a recognised value."
              />
            )}
          </span>
        </Td>
      </Tr>
      {isOpen && (
        <tr>
          <Td colSpan={7} className="pb-4 pl-9">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-start gap-6">
              {r.detail.map((section) => (
                <div key={section.title}>
                  <div className="ops-card-title mb-2.5 border-b border-app-border pb-1.5">
                    {section.title}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {section.fields.map((f) => (
                      <DetailField key={f.label} {...f} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Td>
        </tr>
      )}
    </>
  );
}
