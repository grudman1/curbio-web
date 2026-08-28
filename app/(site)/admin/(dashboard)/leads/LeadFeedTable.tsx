"use client";

import { useState } from "react";
import { Table, Th } from "../../_ui/DataTable";
import { Badge } from "../../_ui/primitives";
import { DELIVERY_TONE } from "../../_ui/tone";

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
  unverified: boolean;
  detail: FeedDetailSection[];
};

const CELL = "border-b border-app-border px-3 py-2.5 align-baseline font-sans text-ops-table";

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
      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-content-subtle">{label}</span>
      <span
        className={`text-[13px] leading-[1.45] [overflow-wrap:anywhere] ${
          highlight === "fail"
            ? "font-semibold text-tone-bad"
            : highlight === "warn"
              ? "font-semibold text-tone-warn-text"
              : value === "—"
                ? "text-content-subtle"
                : "text-content"
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
      <thead>
        <tr>
          <Th className="w-[28px]" aria-label="Expand" />
          <Th>Received</Th>
          <Th>Name</Th>
          <Th>Market</Th>
          <Th>Source</Th>
          <Th>Campaign</Th>
          <Th>Delivery</Th>
        </tr>
      </thead>
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
  const openBorder = isOpen ? "border-b-0" : "";
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer transition-colors duration-fast ease-out ${
          isOpen ? "bg-app-well" : "hover:bg-app-well"
        }`}
      >
        <td className={`${CELL} ${openBorder} w-[28px] pl-ops-panel pr-1`}>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Collapse" : "Expand"} lead from ${r.name}, ${r.received}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`inline-block cursor-pointer border-0 bg-transparent p-0.5 text-[11px] leading-none text-content-subtle transition-transform duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none ${
              isOpen ? "rotate-90" : ""
            }`}
          >
            ▶
          </button>
        </td>
        <td className={`${CELL} ${openBorder} whitespace-nowrap text-content-muted`}>{r.received}</td>
        <td className={`${CELL} ${openBorder} font-semibold text-content`}>{r.name}</td>
        <td className={`${CELL} ${openBorder} text-content`}>{r.market}</td>
        <td className={`${CELL} ${openBorder} text-content`}>{r.source}</td>
        <td className={`${CELL} ${openBorder} text-content-muted`}>{r.campaign}</td>
        <td className={`${CELL} ${openBorder} whitespace-nowrap pr-ops-panel`}>
          <span className="inline-flex gap-1.5">
            <Badge tone={DELIVERY_TONE[r.deliveryTone]}>{r.deliveryLabel}</Badge>
            {r.unverified && <Badge tone="warn">unverified</Badge>}
          </span>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-app-well">
          <td colSpan={7} className={`${CELL} py-1 pb-4 pl-9 pr-ops-panel`}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-start gap-6">
              {r.detail.map((section) => (
                <div key={section.title}>
                  <div className="mb-2.5 border-b border-app-border pb-1.5 font-sans text-ops-card-title font-semibold text-content">
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
          </td>
        </tr>
      )}
    </>
  );
}
