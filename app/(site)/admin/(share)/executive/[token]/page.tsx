import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { timingSafeEqualStr } from "@/lib/adminSession";
import { execShareToken } from "@/lib/execShare";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { readExecNotes } from "@/lib/marketingExecNotes";
import { ExecutiveReview } from "@/app/(site)/admin/(dashboard)/executive/ExecutiveReview";

// ─────────────────────────────────────────────────────────────────────────────
// /admin/executive/[token] — presentation mode. The token is ONE
// env-configured string (lib/execShare.ts); there is deliberately
// no user management here. Fails closed: env unset → 404, wrong token → 404.
// The middleware lets a matching token through without a session; this check
// repeats the comparison so the route is safe even without the middleware.
//
// ?month=YYYY-MM picks the month; default is the latest with data.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Marketing review — Curbio",
  robots: { index: false, follow: false },
};

export default async function SharedExecutivePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const expected = execShareToken();
  if (!expected || !timingSafeEqualStr(token, expected)) notFound();

  const sp = await searchParams;
  const requested = typeof sp.month === "string" ? sp.month : undefined;
  const month =
    requested && SNAPSHOT_MONTHS.includes(requested)
      ? requested
      : SNAPSHOT_MONTHS[SNAPSHOT_MONTHS.length - 1];
  if (!month) notFound();

  const notes = await readExecNotes(month);

  return <ExecutiveReview month={month} notes={notes} editable={false} share />;
}
