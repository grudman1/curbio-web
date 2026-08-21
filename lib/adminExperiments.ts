import { readRecentLeads, type LeadRow } from "./adminLeads";
import { ACTIVE_EXPERIMENT, VARIANTS, hasVariance, isVariant, type CtaVariant } from "./ctaVariant";

// ─────────────────────────────────────────────────────────────────────────────
// A/B results — read-only, derived entirely from the lead store.
//
// NO NEW DATA PATH. This reads the same leads:v1 records the Leads tab reads,
// through the same cache()-deduped readRecentLeads(), on the same read-only
// token. `variant` has been recorded on every lead since the experiment
// started; this module only groups what is already there.
//
// ── WHAT THIS CAN AND CANNOT TELL YOU ───────────────────────────────────────
// It can tell you how leads SPLIT between variants. It cannot tell you
// conversion RATE, because there is no denominator: exposure events
// (page_view / form_start) go to GA4 and PostHog only — lib/events.ts fans out
// to those two vendors and nothing writes them to Redis, so the server has no
// count of how many visitors each variant was shown.
//
// That gap is why nothing here computes significance. A lead-share test
// (is the control/treatment split different from 50/50?) would assume both
// arms got equal exposure, which is exactly the thing we are not measuring —
// djb2-mod-2 over random UUIDs is approximately balanced, never guaranteed.
// Reporting p-values on that assumption would be dressing an assumption up as
// evidence. So: raw split, labelled directional, and a note on what would be
// needed to do better. See the view for the wording the operator actually sees.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Leads per arm below which the split is not worth reading at all. A floor for
 * LOOKING, not a threshold for concluding — no number here makes a winner,
 * because without exposure counts there is no test to pass.
 */
export const MIN_PER_VARIANT = 30;

export type VariantTally = {
  variant: CtaVariant;
  leads: number;
  /** Share of tagged leads, 0-1. Zero tagged leads → 0. */
  share: number;
  /** The copy this arm actually served. */
  copy: string;
};

export type ExperimentResult = {
  key: string;
  startedAt: string;
  surface: string;
  /** False when every variant serves identical copy — no test is running. */
  variance: boolean;
  tallies: VariantTally[];
  /** Leads in range carrying a variant — the analysable population. */
  tagged: number;
  /**
   * Leads in range with NO variant field. Pre-experiment records and any lead
   * submitted from a surface that does not bucket (e.g. the waitlist form).
   * Kept visible rather than folded into control — the Leads tab's untagged /
   * unverified convention, for the same reason.
   */
  untagged: number;
  /** Leads scanned before the startedAt filter. */
  scanned: number;
  /** Earliest / latest submittedAt among tagged leads in range. */
  firstLead: string | null;
  lastLead: string | null;
  /** Every arm has at least MIN_PER_VARIANT leads. */
  enough: boolean;
  minPerVariant: number;
};

/** Discriminated on a literal `status` so the view narrows cleanly — a
 *  truthiness check on a `string | null` field does not narrow the union. */
export type ExperimentsResult =
  | { status: "unconfigured" }
  | { status: "error"; error: string }
  | { status: "ok"; result: ExperimentResult };

/** Group already-read lead rows into the active experiment's arms. Pure — the
 *  Redis read lives in readExperimentResults() below. */
export function tallyExperiment(rows: LeadRow[]): ExperimentResult {
  const startMs = Date.parse(`${ACTIVE_EXPERIMENT.startedAt}T00:00:00Z`);
  const counts = new Map<CtaVariant, number>(VARIANTS.map((v) => [v, 0]));
  let tagged = 0;
  let untagged = 0;
  let firstLead: string | null = null;
  let lastLead: string | null = null;

  for (const { lead } of rows) {
    const t = lead.submittedAt ? Date.parse(lead.submittedAt) : NaN;
    // Leads from before the experiment began are not this experiment's data.
    // An unparseable timestamp is excluded rather than guessed into range.
    if (!Number.isFinite(t) || (Number.isFinite(startMs) && t < startMs)) continue;

    if (!isVariant(lead.variant)) {
      untagged++;
      continue;
    }
    counts.set(lead.variant, (counts.get(lead.variant) ?? 0) + 1);
    tagged++;

    const iso = lead.submittedAt as string;
    if (!firstLead || iso < firstLead) firstLead = iso;
    if (!lastLead || iso > lastLead) lastLead = iso;
  }

  const tallies: VariantTally[] = VARIANTS.map((variant) => {
    const leads = counts.get(variant) ?? 0;
    return {
      variant,
      leads,
      share: tagged > 0 ? leads / tagged : 0,
      copy: ACTIVE_EXPERIMENT.copy[variant],
    };
  });

  return {
    key: ACTIVE_EXPERIMENT.key,
    startedAt: ACTIVE_EXPERIMENT.startedAt,
    surface: ACTIVE_EXPERIMENT.surface,
    variance: hasVariance(),
    tallies,
    tagged,
    untagged,
    scanned: rows.length,
    firstLead,
    lastLead,
    enough: tallies.every((t) => t.leads >= MIN_PER_VARIANT),
    minPerVariant: MIN_PER_VARIANT,
  };
}

/** Read the lead store and tally the active experiment. `limit` is the same
 *  "last N leads" scan the Leads tab uses — passing the same value reuses its
 *  cache()d Redis read rather than issuing a second one. */
export async function readExperimentResults(limit: number): Promise<ExperimentsResult> {
  const leads = await readRecentLeads(limit);
  if (!leads.configured) return { status: "unconfigured" };
  if (leads.error) return { status: "error", error: leads.error };
  return { status: "ok", result: tallyExperiment(leads.rows) };
}
