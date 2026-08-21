import type { Metadata } from "next";
import { readExperimentResults, type ExperimentResult } from "@/lib/adminExperiments";
import { Chip, FAIL, MUTED, Meta, OK, Panel, SCAN, SUBTLE, Stat, WARN, eyebrow } from "../ui";

// ─────────────────────────────────────────────────────────────────────────────
// Experiments tab — the results view for the one active A/B test.
//
// Reads the lead store (lib/adminExperiments.ts → readRecentLeads), which is
// the same scan the Leads tab and the alert banner use, so this costs no extra
// Redis read on a request that already loaded leads.
//
// HONEST-DATA RULES, same as the Leads tab and for the same reasons:
//   • No conversion rate is shown, because no exposure denominator exists —
//     said plainly on the page rather than implied by its absence.
//   • No winner, ever. Not "leading", not "up X%". The split is labelled
//     DIRECTIONAL and that is the strongest claim made anywhere here.
//   • No significance figure, because computing one would require assuming
//     equal exposure per arm — the exact thing that is not measured.
//   • Untagged leads are counted separately, never folded into control.
//   • Every number is labelled with the window it covers.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Experiments · Control Room — Curbio",
  robots: { index: false, follow: false },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const td: React.CSSProperties = {
  padding: "11px 16px 11px 0",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  verticalAlign: "baseline",
};

const th: React.CSSProperties = {
  ...eyebrow,
  textAlign: "left",
  padding: "0 16px 10px 0",
  borderBottom: "1px solid var(--color-border-strong)",
  whiteSpace: "nowrap",
};

const note: React.CSSProperties = {
  fontSize: "var(--text-label)",
  color: SUBTLE,
  margin: "12px 0 0",
  lineHeight: 1.55,
};

/** Proportional split bar. Purely a reading aid for the numbers beside it —
 *  deliberately unlabelled with any verdict. */
function SplitBar({ result }: { result: ExperimentResult }) {
  if (result.tagged === 0) return null;
  const tones = [OK, WARN];
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 2 }}>
      {result.tallies.map((t, i) => (
        <div
          key={t.variant}
          style={{
            width: `${Math.max(t.share * 100, t.leads > 0 ? 2 : 0)}%`,
            background: `color-mix(in srgb, ${tones[i % tones.length]} 55%, transparent)`,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default async function ExperimentsTab() {
  const data = await readExperimentResults(SCAN);

  if (data.status === "unconfigured") {
    return (
      <Panel title="Experiments">
        <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
          Upstash not configured in this environment — no lead store to read results from.
        </p>
      </Panel>
    );
  }
  if (data.status === "error") {
    return (
      <Panel title="Experiments">
        <p style={{ fontSize: "var(--text-small)", color: FAIL, margin: 0 }}>
          Lead store unreadable: {data.error} — this is a read failure, not proof no
          experiment data exists.
        </p>
      </Panel>
    );
  }

  const r = data.result;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <>
      {/* ── what is running ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Panel
          title={`Experiment: ${r.key}`}
          right={
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <Chip text={`${r.surface} path`} color={SUBTLE} dashed />
              {r.variance ? (
                <Chip text="running" color={OK} />
              ) : (
                <Chip text="no variance" color={FAIL} />
              )}
            </span>
          }
        >
          {!r.variance && (
            <p
              style={{
                fontSize: "var(--text-small)",
                color: FAIL,
                margin: "0 0 var(--space-4)",
                lineHeight: 1.55,
                fontWeight: 600,
              }}
            >
              Every variant of <code>{r.key}</code> serves identical copy — no test is
              running. Visitors are still being bucketed and every lead below is still
              tagged, so this split is pure noise, not a result. Give a variant different
              copy in <code>lib/ctaVariant.ts</code> to start testing.
            </p>
          )}
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <Stat label="started" value={formatDay(r.startedAt)} />
            <Stat label="tagged leads" value={r.tagged} />
            <Stat
              label="untagged (pre-experiment)"
              value={r.untagged}
              tone={r.untagged ? SUBTLE : undefined}
            />
            <Stat label={`scanned (last ${r.scanned})`} value={r.scanned} tone={SUBTLE} />
          </div>
          <p style={note}>
            Reading <strong>leads:v1</strong>, the same last-{SCAN} scan the Leads tab uses.
            Counts cover leads submitted on or after {formatDay(r.startedAt)}
            {r.firstLead ? (
              <>
                {" "}
                — data present spans <strong>{formatDay(r.firstLead)}</strong> to{" "}
                <strong>{formatDay(r.lastLead)}</strong>.
              </>
            ) : (
              <> — no tagged leads in that window yet.</>
            )}{" "}
            Untagged leads carry no variant (recorded before the experiment, or submitted
            from a surface that does not bucket, like the waitlist form); they are counted
            separately and never folded into control.
          </p>
        </Panel>
      </div>

      {/* ── the split ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Panel
          title="Leads by variant"
          right={
            r.enough ? (
              <Chip text="directional only" color={WARN} dashed />
            ) : (
              <Chip text="not enough data" color={SUBTLE} />
            )
          }
        >
          {r.tagged === 0 ? (
            <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0, lineHeight: 1.55 }}>
              No leads carrying a variant in this window yet. Nothing to show — this is an
              empty result, not a zero result.
            </p>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                <thead>
                  <tr>
                    <th style={th}>Variant</th>
                    <th style={th}>Copy served</th>
                    <th style={{ ...th, textAlign: "right" }}>Leads</th>
                    <th style={{ ...th, textAlign: "right", paddingRight: 0 }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {r.tallies.map((t) => (
                    <tr key={t.variant}>
                      <td style={{ ...td, fontWeight: 600 }}>{t.variant}</td>
                      <td style={{ ...td, color: MUTED }}>{t.copy}</td>
                      <td style={{ ...td, textAlign: "right" }}>{t.leads}</td>
                      <td style={{ ...td, textAlign: "right", paddingRight: 0, color: MUTED }}>
                        {pct(t.share)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <SplitBar result={r} />
            </>
          )}

          {!r.enough && r.tagged > 0 && (
            <p
              style={{
                fontSize: "var(--text-small)",
                color: MUTED,
                margin: "16px 0 0",
                lineHeight: 1.55,
              }}
            >
              <strong>Not enough data yet.</strong> Every arm needs at least{" "}
              {r.minPerVariant} leads before this split is worth reading at all
              {r.tallies.some((t) => t.leads < r.minPerVariant) && (
                <>
                  {" "}
                  (
                  {r.tallies
                    .filter((t) => t.leads < r.minPerVariant)
                    .map((t) => `${t.variant}: ${t.leads}`)
                    .join(", ")}
                  )
                </>
              )
              }. No winner is shown at any sample size — see below for why.
            </p>
          )}
        </Panel>
      </div>

      {/* ── what this measurement cannot do ── */}
      <div style={{ maxWidth: 760 }}>
        <Panel title="Conversion rate" right={<Meta>not available</Meta>}>
          <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0, lineHeight: 1.6 }}>
            <strong>No conversion rate is shown, because there is no denominator.</strong>{" "}
            Exposure events (<code>page_view</code>, <code>form_start</code>) are sent to
            GA4 and PostHog only — <code>lib/events.ts</code> fans out to those two vendors
            and nothing writes them to Redis. The server therefore knows how many leads each
            variant produced, but not how many visitors each variant was shown, and a rate
            needs both.
          </p>
          <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: "14px 0 0", lineHeight: 1.6 }}>
            For the same reason <strong>no significance test is computed</strong>. The one
            test available without a denominator — asking whether the lead split differs
            from 50/50 — assumes both arms received equal exposure, which is exactly what
            is not measured here (djb2-mod-2 over random ids is approximately balanced,
            never guaranteed). Reporting a p-value on that assumption would dress an
            assumption up as evidence. The split above is <strong>directional only</strong>.
          </p>
          <p style={note}>
            To get real rates: persist <code>form_start</code> / page-view counts by variant
            server-side, or read exposure from PostHog and join on variant. Either gives a
            denominator, and a proper two-proportion test becomes possible.
          </p>
        </Panel>
      </div>
    </>
  );
}
