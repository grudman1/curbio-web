import { CHANNEL_LABELS } from "@/config/marketingHub";
import { tierWhy, type ChannelPlan, type Tier } from "@/config/channelPlan";
import { CHANNEL_COLORS } from "@/lib/channels";
import { OpsMetric } from "./v2/OpsCard";
import { HealthList, StatusBadge, type HealthItem } from "./v2/HealthDot";
import { EmptyState } from "./v2/EmptyState";

// ─────────────────────────────────────────────────────────────────────────────
// A channel screen is: title, tier badge, four metric tiles, the channel's own
// surface, and a row of dots for what is still missing. Nothing else.
//
// Every fact the v1 brief printed still exists; none of them is prose any more:
//
//   purpose / memo # / owner  →  title= on the tier badge
//   HELD TO                   →  target badges in the header row
//   MEASURED AS               →  channel badges in the header row
//   basisNote                 →  title= on the attribution-basis badge, and on
//                                the Qualified tile's unwired dot
//   NEEDS                     →  HealthList — a dot per item, sentence on hover
//
// The v1 file rendered `basisNote` as a standing well of grey text on the two
// channels that have one (Events is attributed by campaign code, Content is
// measured elsewhere). That sentence is load-bearing, so it did not get cut —
// it moved onto the badge that names the basis, where a reader who wonders why
// the number looks odd will actually be pointing.
// ─────────────────────────────────────────────────────────────────────────────

const TIER_TONE: Record<Tier, "success" | "warning" | "error" | "neutral"> = {
  1: "success",
  2: "warning",
  3: "neutral",
};

/** The tier pill, for PageHeader's `badge` slot. The plan's purpose, memo
 *  position and owner ride on its tooltip — they were a popover of three
 *  paragraphs and they are worth exactly one hover. */
export function ChannelTierBadge({ plan }: { plan: ChannelPlan }) {
  return (
    <span
      title={`${plan.purpose} · Tier ${plan.tier} — ${tierWhy(plan.tier)} · #${plan.memoNumbers.join(" and #")} in the CEO memo · ${plan.owner}`}
    >
      <StatusBadge status={`Tier ${plan.tier}`} tone={TIER_TONE[plan.tier]} />
    </span>
  );
}

/** Header badges: what the channel is held to, and what it is measured as.
 *  Rendered by the page into PageHeader's `right` slot. */
export function ChannelChips({ plan }: { plan: ChannelPlan }) {
  return (
    <>
      {plan.targets.map((t) => (
        <span key={t.label} className="ops-badge ops-badge--neutral" title={`Target — ${t.label}`}>
          {t.label}
          <strong className="ops-tnum font-bold">{t.value}</strong>
        </span>
      ))}
      {plan.channels.map((c) => (
        <span
          key={c}
          title={`Measured as ${CHANNEL_LABELS[c]}`}
          className="ops-badge ops-badge--neutral"
        >
          <span
            aria-hidden
            className="ops-swatch rounded-full"
            style={{ background: CHANNEL_COLORS[c] }}
          />
          {CHANNEL_LABELS[c]}
        </span>
      ))}
      {plan.basis !== "channel" && (
        <span className="ops-badge ops-badge--warning" title={plan.basisNote}>
          {plan.basis === "campaign-code" ? "campaign-code" : "measured elsewhere"}
        </span>
      )}
    </>
  );
}

export type ChannelMetric = {
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  /** Qualification for the number, on hover — never as standing text. */
  title?: string;
  /** No source behind the number: hollow dot, em-dash, no caption. */
  unwired?: { tooltip: string };
};

export function ChannelBrief({
  plan,
  metrics,
  children,
}: {
  plan: ChannelPlan;
  metrics?: ChannelMetric[];
  /** The channel's own surface, when it has one. */
  children?: React.ReactNode;
}) {
  const needs: HealthItem[] = plan.needs.map((need) => ({
    label: shortLabel(need),
    tooltip: need,
  }));

  return (
    <>
      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
          {metrics.map((m) => (
            // OpsMetric has no title prop by design; a metric that needs
            // qualifying carries it on a wrapping element instead. The
            // [&>div]:h-full keeps the wrapped card as tall as its
            // unwrapped grid neighbours.
            <div key={m.label} title={m.title} className="h-full [&>div]:h-full">
              <OpsMetric label={m.label} value={m.value} suffix={m.suffix} unwired={m.unwired} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 md:mt-6">
        {children ?? <EmptyState headline={`No ${plan.label} surface yet`} />}
      </div>

      {needs.length > 0 && (
        <div className="mt-5">
          <HealthList items={needs} />
        </div>
      )}
    </>
  );
}

/** First clause of a need sentence — enough to name it, short enough to scan.
 *  Trailing connectives are dropped so a truncated label never ends on "and".
 *  (Same shape as SurfaceHealth's, which reads the same kind of config line.) */
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
