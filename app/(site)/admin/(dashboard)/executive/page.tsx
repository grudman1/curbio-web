import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { readExecNotes } from "@/lib/marketingExecNotes";
import { execShareToken } from "@/lib/execShare";
import { monthLabel, parseTimeframe } from "@/app/(site)/admin/_ui/timeframe";
import { DefinitionsInfo } from "@/app/(site)/admin/_ui/hubUi";
import { SurfaceHeader, SurfaceHealth } from "@/app/(site)/admin/_ui/v2/SurfaceHeader";
import { StatusBadge } from "@/app/(site)/admin/_ui/v2/HealthDot";
import { ExecutiveReview } from "./ExecutiveReview";

// ─────────────────────────────────────────────────────────────────────────────
// Executive — the operator's view of the exec review. The header timeframe
// picks the month (a range coerces to its latest month — this page is a
// monthly review by definition); the agenda is editable here and read-only on
// the tokened share route.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Executive · Ops — Curbio",
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

  const shareToken = execShareToken();

  return (
    <>
      {/* The coerced-month fact and the share-link state are chips with the
          sentence on hover — the operator chrome follows the no-prose rule
          even though the review body below is deliberately a narrated
          document. */}
      <SurfaceHeader
        surface={surface}
        right={
          <>
            {tf.kind !== "month" && month && (
              <StatusBadge
                status={`showing ${monthLabel(month)}`}
                tone="neutral"
                title="The review is monthly — a range in the header coerces to its latest month with data."
              />
            )}
            {shareToken ? (
              <StatusBadge
                status="share link live"
                tone="success"
                title="Read-only share: /admin/executive/<token> — no sidebar, larger type, printable."
              />
            ) : (
              <StatusBadge
                status="no share link"
                tone="neutral"
                title="Set EXEC_SHARE_TOKEN to enable the read-only share route."
              />
            )}
            <DefinitionsInfo align="right" />
          </>
        }
      />
      {month ? (
        <ExecutiveReview month={month} notes={notes} editable />
      ) : (
        <p className="font-sans text-ops-body text-content-muted">No months with data yet.</p>
      )}
      <SurfaceHealth surface={surface} />
    </>
  );
}
