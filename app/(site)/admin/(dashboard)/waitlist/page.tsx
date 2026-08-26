import type { Metadata } from "next";
import { countsByState, maskEmail, maskName, readRecentWaitlist, type WaitlistEntry } from "@/lib/adminWaitlist";
import { MUTED, Meta, Panel, SCAN, SUBTLE, Stat } from "../ui";

// ─────────────────────────────────────────────────────────────────────────────
// Waitlist tab — out-of-area signups, the expansion-demand signal.
//
// These never reach the CRM (app/api/lead/route.ts skips postToCrm() for
// source: "waitlist" entirely — there is no market to route them to), so
// this page is the only place they're visible at all. It answers one
// question: where should Curbio expand next? Hence the state breakdown, not
// a delivery/attribution audit like the Leads tab.
//
// Identities stay masked, same reasoning as Leads: this page is for spotting
// demand clusters, not for looking someone up.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Waitlist · Ops — Curbio",
  robots: { index: false, follow: false },
};

// "2026-08-07T14:03:22Z" → "Aug 7, 14:03" — same convention as the Leads tab.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const v = (x: string | null | undefined) => (x ? x : "—");

const th: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-micro)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SUBTLE,
  textAlign: "left",
  padding: "0 16px 10px 0",
  borderBottom: "1px solid var(--color-border-strong)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "11px 16px 11px 0",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  verticalAlign: "baseline",
  whiteSpace: "nowrap",
};

function detected(e: WaitlistEntry): string {
  return [e.detectedCity, e.detectedRegion].filter(Boolean).join(", ") || "—";
}

export default async function WaitlistTab() {
  const result = await readRecentWaitlist(SCAN);
  const entries = result.configured && !result.error ? result.entries : [];
  const byState = countsByState(entries);
  const now = Date.now();
  const DAY = 86_400_000;
  const last24h = entries.filter((e) => {
    const t = e.submittedAt ? Date.parse(e.submittedAt) : NaN;
    return Number.isFinite(t) && now - t < DAY;
  }).length;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-4)",
        }}
      >
        <Panel
          title="Volume"
          right={<Meta>{result.configured ? `${result.total} stored` : "no store"}</Meta>}
        >
          <div style={{ display: "flex", gap: 32 }}>
            <Stat label="last 24 h" value={result.configured ? last24h : "—"} />
            <Stat label={`scanned (last ${entries.length})`} value={result.configured ? entries.length : "—"} />
            <Stat label="states represented" value={result.configured ? byState.length : "—"} />
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "var(--space-4)", alignItems: "start" }}>
        <Panel title="Waitlist signups" right={<Meta>newest {Math.min(entries.length, 50)}</Meta>}>
          {!result.configured ? (
            <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
              Upstash not configured in this environment.
            </p>
          ) : entries.length === 0 ? (
            <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
              No waitlist signups yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Date</th>
                    <th style={th}>Name</th>
                    <th style={th}>Email</th>
                    <th style={th}>ZIP</th>
                    <th style={th}>Detected</th>
                    <th style={{ ...th, paddingRight: 0 }}>First-touch channel</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 50).map((e, i) => (
                    <tr key={e.leadId ?? `row-${i}`}>
                      <td style={{ ...td, color: MUTED }}>{formatTime(e.submittedAt)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{maskName(e)}</td>
                      <td style={td}>{maskEmail(e.email)}</td>
                      <td style={td}>{v(e.zip)}</td>
                      <td style={td}>{detected(e)}</td>
                      <td style={{ ...td, paddingRight: 0, color: MUTED }}>{v(e.firstTouchChannel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0" }}>
            Identities stay masked — this page is for spotting demand clusters, not for looking someone up.
          </p>
        </Panel>

        <Panel title="By state" right={<Meta>expansion-demand signal</Meta>}>
          {byState.length === 0 ? (
            <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>No data yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {byState.map((row) => (
                  <tr key={row.state}>
                    <td style={{ ...td, fontWeight: 600 }}>{row.state}</td>
                    <td style={{ ...td, paddingRight: 0, textAlign: "right", color: MUTED }}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0", lineHeight: 1.5 }}>
            &ldquo;Unknown&rdquo; means Vercel&rsquo;s geo header was absent for that submission — not a state Curbio serves.
          </p>
        </Panel>
      </div>
    </>
  );
}
