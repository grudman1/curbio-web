// The honest panel. One prominent number — the share of this timeframe's
// Qualified leads with no known channel — labeled plainly, with a 6-month
// line showing whether it is falling. Shrinking this number is the actual
// job; the panel exists to keep it visible every time the page loads.
//
// Server component: pure numbers in, SVG out. Used by Today (compact) and by
// the Attribution health page (detailed, with the raw-source breakdown).

import Link from "next/link";
import {
  aggregateSnapshot,
  directShareByMonth,
  directSourceBreakdown,
  SNAPSHOT_LABEL,
} from "@/config/appLeadsSnapshot";
import { CHANNEL_COLORS } from "@/lib/channels";
import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { Eyebrow, Meta, Panel } from "@/app/(site)/admin/_ui/primitives";
import { monthShort } from "./timeframe";
import { DASH } from "./hubUi";

/** 6-month line of the unattributed share, 0–100% fixed scale so month-to-
 *  month movement reads against the whole range, not a zoomed drama. */
function ShareLine({ points }: { points: { ym: string; share: number }[] }) {
  if (points.length === 0) return null;
  const W = 340;
  const H = 96;
  const padX = 16;
  const padTop = 18;
  const padBottom = 20;
  const step = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const y = (share: number) => padTop + (1 - share) * (H - padTop - padBottom);
  const coords = points.map((p, i) => [padX + i * step, y(p.share)] as const);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full max-w-[420px]"
      role="img"
      aria-label={`Unattributed share by month: ${points.map((p) => `${monthShort(p.ym)} ${Math.round(p.share * 100)}%`).join(", ")}`}
    >
      {/* 0% and 100% reference lines */}
      <line x1={padX} y1={y(0)} x2={W - padX} y2={y(0)} stroke="var(--app-border)" />
      <line x1={padX} y1={y(1)} x2={W - padX} y2={y(1)} stroke="var(--app-border)" strokeDasharray="2 4" />
      <polyline
        points={coords.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")}
        fill="none"
        stroke={CHANNEL_COLORS.direct}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map(([px, py], i) => (
        <g key={points[i].ym}>
          <circle cx={px} cy={py} r="2.5" fill={CHANNEL_COLORS.direct} />
          <text
            x={px}
            y={py - 7}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-family-sans)", fontSize: 10.5, fontWeight: 700, fill: "var(--fg-muted)" }}
          >
            {Math.round(points[i].share * 100)}%
          </text>
          <text
            x={px}
            y={H - 6}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-family-sans)", fontSize: 10.5, fill: "var(--fg-subtle)" }}
          >
            {monthShort(points[i].ym)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function AttributionHealthPanel({
  months,
  tfLabel,
  detailed = false,
}: {
  /** The header timeframe's months. */
  months: string[];
  tfLabel: string;
  /** True on the Attribution health page: adds the raw-source breakdown. */
  detailed?: boolean;
}) {
  const monthSet = new Set(months);
  const agg = aggregateSnapshot(monthSet);

  // Every cell belongs to exactly one market × channel; sum once.
  let direct = 0;
  let total = 0;
  for (const [cellKey, cell] of Object.entries(agg.cells)) {
    total += cell.qualified;
    if (cellKey.endsWith("|direct")) direct += cell.qualified;
  }
  const share = total > 0 ? direct / total : null;

  const line = directShareByMonth()
    .slice(-6)
    .map(({ ym, direct: d, total: t }) => ({ ym, share: t ? d / t : 0 }));

  const sources = detailed ? directSourceBreakdown(monthSet) : [];

  return (
    <Panel
      title="Attribution health"
      right={
        <Meta>
          {tfLabel} · {SNAPSHOT_LABEL}
        </Meta>
      }
    >
      <div className="flex flex-wrap items-start gap-9">
        <div className="min-w-[240px] flex-[0_1_300px]">
          <div className="flex items-baseline gap-2.5">
            <span className="font-sans text-[46px] font-bold leading-none tabular-nums text-content">
              {share === null ? DASH : `${Math.round(share * 100)}%`}
            </span>
            <span className="font-sans text-ops-body text-content-muted">
              {share === null ? "no Qualified in this timeframe" : `${direct} of ${total} Qualified`}
            </span>
          </div>
          <p className="m-0 mt-3 max-w-[340px] font-sans text-ops-body leading-[1.6] text-content">
            <strong>Unattributed.</strong> These leads arrived with no UTM, no first-touch cookie,
            and no tracked phone number. We do not know what produced them.
          </p>
          {!detailed && (
            <p className="m-0 mt-2.5">
              <Link
                href="/marketing/attribution"
                className="font-sans text-ops-label font-bold text-content-muted hover:text-content"
              >
                What the app recorded instead →
              </Link>
            </p>
          )}
        </div>
        <div className="min-w-[260px] max-w-[440px] flex-[1_1_300px]">
          <Eyebrow className="mb-1.5 block">Unattributed share, last {line.length} months</Eyebrow>
          <ShareLine points={line} />
          <p className="m-0 mt-1.5 font-sans text-ops-label leading-[1.5] text-content-subtle">
            Shrinking this line is the job. It falls when links carry UTMs, printed assets point at
            tracked redirects, and phone leads get tracked numbers.
          </p>
        </div>
      </div>

      {detailed && (
        <div className="mt-5">
          <Eyebrow className="mb-2 block">What the app recorded for these leads</Eyebrow>
          <div className="max-w-[600px] overflow-hidden rounded-md border border-app-border">
            <Table>
              <thead>
                <tr>
                  <Th>Raw referral source</Th>
                  <Th align="right">Leads</Th>
                  <Th>What would attribute it</Th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <Tr key={s.source}>
                    <Td className="font-mono text-[12.5px]">{s.source}</Td>
                    <Td align="right" className="font-semibold">
                      {s.count}
                    </Td>
                    <Td className="text-content-muted">
                      {/^phone/i.test(s.source)
                        ? "a tracked phone number per market / event"
                        : s.source === "(blank)"
                          ? "a form that records its source"
                          : /curbio\.com|landing page|lp/i.test(s.source)
                            ? "UTMs on the link that brought them"
                            : "a documented source mapping (see Links registry)"}
                    </Td>
                  </Tr>
                ))}
                {sources.length === 0 && (
                  <tr>
                    <Td muted colSpan={3}>
                      No unattributed leads in this timeframe.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          <p className="m-0 mt-3 font-sans text-ops-label leading-[1.6] text-content-subtle">
            These strings say where the form was, not what brought the visitor — which is why they
            map to direct instead of a channel.
          </p>
        </div>
      )}
    </Panel>
  );
}
