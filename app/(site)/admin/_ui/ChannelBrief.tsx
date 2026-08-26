import { CHANNEL_LABELS } from "@/config/marketingHub";
import { tierWhy, type ChannelPlan } from "@/config/channelPlan";
import { CHANNEL_COLORS } from "@/lib/channels";
import { Chip, DASH, Eyebrow, Panel } from "./primitives";
import { InfoPopover } from "./InfoPopover";
import { MetricTile } from "./MetricTile";

// ─────────────────────────────────────────────────────────────────────────────
// A channel that has no data yet is NOT an empty state. It has a tier, an
// owner, a target and a budget before it has a single lead — that is a BRIEF,
// and it is useful on day one.
//
// EmptyState stays for surfaces that genuinely have no purpose yet. This is
// for surfaces whose purpose is fully specified and whose numbers simply
// haven't arrived. The difference matters: one says "nothing here", the other
// says "here is what this is for, and here is the scoreboard reading em-dash".
//
// It also surfaces the $150-per-meeting and $25-per-attendee targets that were
// previously buried in config/marketingHub.ts and rendered nowhere.
//
// THE BASIS LABEL IS LOAD-BEARING. Events is attributed by campaign code and
// Content is measured on other channels' screens. Both would otherwise look
// exactly like the five that ARE channel-attributed, which would be a quiet
// category error. `basisNote` renders as a chip plus a line, not a footnote.
// ─────────────────────────────────────────────────────────────────────────────

const TIER_TONE = { 1: "good", 2: "warn", 3: "unknown" } as const;

export function ChannelBrief({
  plan,
  /** Real numbers when the channel is wired. Absent = every tile em-dashes. */
  metrics,
}: {
  plan: ChannelPlan;
  metrics?: { label: string; value: number | null; format?: (n: number) => string; note?: string }[];
}) {
  return (
    <>
      {/* ── what this channel is, and how it is measured ── */}
      <div className="mb-ops-gap flex flex-wrap items-center gap-2">
        <Chip tone={TIER_TONE[plan.tier]}>Tier {plan.tier}</Chip>
        <InfoPopover label={`Why tier ${plan.tier}`}>{tierWhy(plan.tier)}</InfoPopover>
        <span className="font-sans text-ops-label text-content-subtle">#{plan.memoNumber} in the CEO memo</span>
        <span className="font-sans text-ops-label text-content-subtle">·</span>
        <span className="font-sans text-ops-label text-content-muted">{plan.owner}</span>
        {plan.basis !== "channel" && (
          <Chip tone="unknown">
            {plan.basis === "campaign-code" ? "campaign-code attributed" : "measured elsewhere"}
          </Chip>
        )}
      </div>

      <p className="m-0 mb-ops-gap max-w-[70ch] font-sans text-ops-body leading-[1.45] text-content-muted">
        {plan.purpose}
      </p>

      {/* The honest disclaimer, on the face of the screen — never a footnote. */}
      {plan.basisNote && (
        <p className="m-0 mb-ops-gap max-w-[70ch] border-l-2 border-tone-unknown pl-3 font-sans text-ops-label leading-[1.5] text-content-subtle">
          {plan.basisNote}
        </p>
      )}

      {/* ── the scoreboard ── */}
      {metrics && metrics.length > 0 && (
        <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
          {metrics.map((m) => (
            <MetricTile key={m.label} label={m.label} value={m.value} format={m.format} note={m.note} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-ops-gap lg:grid-cols-2">
        {/* ── targets: the numbers this channel is held to ── */}
        <Panel title="Held to">
          <dl className="m-0">
            {plan.targets.map((t) => (
              <div key={t.label} className="flex h-ops-row items-center gap-3 border-b border-edge last:border-b-0">
                <dt className="min-w-0 flex-1 truncate font-sans text-ops-body text-content-muted">{t.label}</dt>
                <dd className="m-0 flex-none font-sans text-ops-body font-bold tabular-nums text-content">
                  {t.value}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>

        {/* ── measured channels, or an explicit statement that there are none ── */}
        <Panel
          title="Measured as"
          right={
            <InfoPopover label="Planning channels vs measured channels" align="right">
              The seven are how the business is planned. The nine values in lib/channels.ts are what a
              lead can actually be tagged with. They do not map one-to-one, and collapsing them would
              invent channels the data cannot support.
            </InfoPopover>
          }
        >
          {plan.channels.length > 0 ? (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {plan.channels.map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-edge px-2.5 py-[3px] font-sans text-ops-label font-semibold text-content-muted"
                >
                  <span
                    aria-hidden
                    className="inline-block h-[7px] w-[7px] flex-none rounded-full"
                    style={{ backgroundColor: CHANNEL_COLORS[c] }}
                  />
                  {CHANNEL_LABELS[c]}
                </li>
              ))}
            </ul>
          ) : (
            // The basisNote is already stated prominently above — repeating it
            // here just makes the reader check whether the two say the same
            // thing. This panel answers only its own question.
            <p className="m-0 font-sans text-ops-body text-content-subtle">
              {DASH} No channel value. This is the honest state, not a gap in the mapping.
            </p>
          )}
        </Panel>
      </div>

      {/* ── the build backlog ── */}
      <div className="mt-ops-gap">
        <Panel title="Needs">
          <ol className="m-0 list-decimal pl-5 font-sans text-ops-body leading-[1.7] text-content-muted">
            {plan.needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
