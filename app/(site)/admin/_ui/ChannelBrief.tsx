import { CHANNEL_LABELS } from "@/config/marketingHub";
import { tierWhy, type ChannelPlan } from "@/config/channelPlan";
import { CHANNEL_COLORS } from "@/lib/channels";
import { Chip } from "./primitives";
import { Disclosure } from "./Disclosure";
import { InfoPopover } from "./InfoPopover";
import { StatCard } from "./StatCard";

// ─────────────────────────────────────────────────────────────────────────────
// A channel screen is: title, tier chip, four metric tiles, and a table.
// Nothing else is visible until asked for.
//
// This used to render four panels of prose — a description line, HELD TO,
// MEASURED AS, and a NEEDS list — before a single number. Every one of those
// facts still exists; none of them is a panel any more:
//
//   purpose        →  ⓘ beside the title
//   HELD TO        →  chips in the header row
//   MEASURED AS    →  chips in the header row
//   NEEDS          →  "N things needed ›", collapsed
//
// The one thing that stays visible as text is `basisNote`, and only for the
// two channels that have one. Events is attributed by campaign code and
// Content is measured elsewhere; a reader who misses that will misread every
// number on the screen, so it does not go behind a disclosure.
// ─────────────────────────────────────────────────────────────────────────────

const TIER_TONE = { 1: "good", 2: "warn", 3: "unknown" } as const;

/** Header chips. Rendered by the page into PageHeader's `right` slot so the
 *  title row carries the whole brief. */
export function ChannelChips({ plan }: { plan: ChannelPlan }) {
  return (
    <>
      <Chip tone={TIER_TONE[plan.tier]}>Tier {plan.tier}</Chip>
      {plan.targets.map((t) => (
        <span
          key={t.label}
          className="inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-pill border border-app-border px-2.5 py-[3px] font-sans text-ops-micro text-content-muted"
        >
          {t.label}
          <span className="font-bold tabular-nums text-content">{t.value}</span>
        </span>
      ))}
      {plan.channels.map((c) => (
        <span
          key={c}
          title={`measured as ${CHANNEL_LABELS[c]}`}
          className="inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-pill border border-app-border px-2.5 py-[3px] font-sans text-ops-micro font-semibold text-content-muted"
        >
          <span
            aria-hidden
            className="inline-block h-[7px] w-[7px] flex-none rounded-full"
            style={{ backgroundColor: CHANNEL_COLORS[c] }}
          />
          {CHANNEL_LABELS[c]}
        </span>
      ))}
      {plan.basis !== "channel" && (
        <Chip tone="unknown">
          {plan.basis === "campaign-code" ? "campaign-code" : "measured elsewhere"}
        </Chip>
      )}
      <InfoPopover label={`About ${plan.label}`} align="right">
        <p className="m-0 mb-2">{plan.purpose}</p>
        <p className="m-0 mb-2 text-content-subtle">
          #{plan.memoNumbers.join(" and #")} in the CEO memo · {plan.owner}
        </p>
        <p className="m-0 text-content-subtle">Tier {plan.tier} — {tierWhy(plan.tier)}</p>
      </InfoPopover>
    </>
  );
}

export function ChannelBrief({
  plan,
  metrics,
  children,
}: {
  plan: ChannelPlan;
  metrics?: { label: string; value: number | null; format?: (n: number) => string; note?: string }[];
  /** The table, when the channel has one. */
  children?: React.ReactNode;
}) {
  return (
    <>
      {metrics && metrics.length > 0 && (
        <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
          {metrics.map((m) => (
            <StatCard key={m.label} label={m.label} value={m.value} format={m.format} note={m.note} />
          ))}
        </div>
      )}

      {/* The one line that must not hide: how this channel is attributed, when
          it is not attributed like the others. */}
      {plan.basisNote && (
        <p className="m-0 mb-ops-gap max-w-[80ch] rounded-md bg-app-well px-3 py-2 font-sans text-ops-label leading-[1.5] text-content-muted">
          {plan.basisNote}
        </p>
      )}

      {children}

      <div className="mt-ops-gap">
        <Disclosure summary={`${plan.needs.length} things needed`}>
          <ol className="m-0 list-decimal pl-5 leading-[1.7]">
            {plan.needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </Disclosure>
      </div>
    </>
  );
}
