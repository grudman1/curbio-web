import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { readExecNotes } from "@/lib/marketingExecNotes";
import { Meta } from "@/app/(site)/admin/(dashboard)/ui";
import { monthLabel, parseTimeframe } from "../timeframe";
import { HubPageHeader, NeedsBlock } from "../hubUi";
import { ExecutiveReview } from "./ExecutiveReview";

// ─────────────────────────────────────────────────────────────────────────────
// Executive — the operator's view of the exec review. The header timeframe
// picks the month (a range coerces to its latest month — this page is a
// monthly review by definition); the agenda is editable here and read-only on
// the tokened share route.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Executive · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.executive;

export default async function ExecutivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS);
  // A monthly review needs a month: ranges coerce to their latest month.
  const month =
    tf.kind === "month" ? tf.ym : SNAPSHOT_MONTHS[SNAPSHOT_MONTHS.length - 1] ?? "";
  const notes = month ? await readExecNotes(month) : null;

  const shareToken = process.env.MARKETING_EXEC_SHARE_TOKEN;

  return (
    <>
      <HubPageHeader surface={surface} />
      {tf.kind !== "month" && month && (
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: "var(--color-text-muted)", margin: "0 0 var(--space-4)" }}>
          The review is monthly — showing {monthLabel(month)}, the latest month with data.
          Pick a single month in the header to review another.
        </p>
      )}
      {month ? (
        <ExecutiveReview month={month} notes={notes} editable />
      ) : (
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
          No months with data yet.
        </p>
      )}
      <div style={{ marginTop: "var(--space-6)" }}>
        {shareToken ? (
          <Meta>
            Read-only share link: /marketing/executive/{"<token>"} — no sidebar, no
            password, larger type. Configured via MARKETING_EXEC_SHARE_TOKEN.
          </Meta>
        ) : (
          <Meta>
            Presentation mode: set MARKETING_EXEC_SHARE_TOKEN to enable the read-only
            share link (/marketing/executive/{"<token>"}).
          </Meta>
        )}
      </div>
      <div style={{ marginTop: "var(--space-5)" }}>
        <NeedsBlock surface={surface} />
      </div>
    </>
  );
}
