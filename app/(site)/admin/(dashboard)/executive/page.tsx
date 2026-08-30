import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { readExecNotes } from "@/lib/marketingExecNotes";
import { execShareToken } from "@/lib/execShare";
import { Meta } from "@/app/(site)/admin/_ui/primitives";
import { monthLabel, parseTimeframe } from "@/app/(site)/admin/_ui/timeframe";
import { DefinitionsInfo, HubPageHeader, NeedsBlock } from "@/app/(site)/admin/_ui/hubUi";
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
      <HubPageHeader surface={surface} right={<DefinitionsInfo align="right" />} />
      {tf.kind !== "month" && month && (
        <p className="m-0 mb-4 font-sans text-ops-label text-content-muted">
          The review is monthly — showing {monthLabel(month)}, the latest month with data.
        </p>
      )}
      {month ? (
        <ExecutiveReview month={month} notes={notes} editable />
      ) : (
        <p className="font-sans text-ops-body text-content-muted">No months with data yet.</p>
      )}
      <div className="mt-6">
        <Meta>
          {shareToken
            ? "Read-only share link: /admin/executive/<token> — no sidebar, larger type."
            : "Set EXEC_SHARE_TOKEN to enable the read-only share link."}
        </Meta>
      </div>
      <div className="mt-5">
        <NeedsBlock surface={surface} />
      </div>
    </>
  );
}
