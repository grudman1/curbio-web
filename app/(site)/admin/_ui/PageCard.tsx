import Link from "next/link";
import type { RegistryEntry } from "@/config/pageRegistry";
import type { PageStat } from "@/lib/pageStats";
import { DASH, Chip, Eyebrow, StatusDot } from "./primitives";
import { InfoPopover } from "./InfoPopover";
import { Sparkline } from "./Sparkline";
import { PAGE_STATUS_TONE } from "./tone";

// ─────────────────────────────────────────────────────────────────────────────
// THE SIGNATURE ELEMENT. The live page, and what it is actually doing.
//
// No other dashboard does this. HubSpot shows you a row. Vercel shows you a
// chart. This shows you the page — actually rendering, right now — with its
// conversion rate welded to it. You recognise a page by looking at it, not by
// parsing its slug, and the number that matters is on the same object.
//
// THE IFRAME IS NOT A DATA SOURCE. It is sandboxed WITHOUT allow-scripts, so
// no JS runs and analytics can never fire from a preview — a dashboard that
// inflated the numbers it reports by rendering them would be worse than
// useless. Every figure in the strip is computed server-side by
// lib/pageStats.ts (computePageStats), called directly from the Pages
// screen — NOT fetched from /api/admin/page-stats, which nothing in this
// codebase currently calls.
// allow-same-origin is granted only so stylesheets apply; with scripting off
// the document cannot act on that origin.
// ─────────────────────────────────────────────────────────────────────────────

/** The thumbnail. Laid out on a virtual viewport 5× the card and scaled back
 *  by exactly 1/5, so capture and container agree BY CONSTRUCTION at any card
 *  width — no dead bands. At a ~300px card that is a ~1500×940 desktop view. */
function Frame({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-t-lg bg-app-card [aspect-ratio:16/10]">
      <iframe
        src={src}
        title={`Preview of ${title}`}
        loading="lazy"
        tabIndex={-1}
        aria-hidden
        sandbox="allow-same-origin"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: "500%", height: "500%", transform: "scale(0.2)" }}
      />
    </div>
  );
}

/** One figure in the strip. Tabular so the three columns align across cards. */
function Figure({
  label,
  value,
  tone = "default",
  title,
}: {
  label: string;
  value: string;
  tone?: "default" | "muted";
  /** Why a DASH is a DASH. Hover reason — the short form of an InfoPopover
   *  for a value that is withheld rather than merely absent. */
  title?: string;
}) {
  return (
    <div className="min-w-0 flex-1" title={title}>
      <Eyebrow>{label}</Eyebrow>
      <div
        className={`mt-0.5 truncate font-sans text-ops-body font-bold tabular-nums ${
          tone === "muted" ? "text-content-subtle" : "text-content"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

const VIEW_SOURCES_NOTE = (
  <>
    <strong className="font-bold text-content">Vercel</strong> counts raw
    pageviews server-side. <strong className="font-bold text-content">GA4</strong> models
    visitors who denied consent under Consent Mode v2, so it usually reports fewer. They
    are shown separately and never averaged — a single blended number would hide which
    one you are looking at.
  </>
);

export function PageCard({
  entry,
  src,
  note,
  variants,
  stat,
  bucket,
  truncated,
}: {
  entry: RegistryEntry;
  /** null for pages with nothing worth previewing (this control room). */
  src: string | null;
  note?: string;
  /** Per-market variant count, always derived from MARKETS — never assumed. */
  variants?: number;
  stat?: PageStat;
  bucket: "day" | "week" | "month";
  /** Lead scan didn't cover the window — CVR is withheld and labelled. */
  truncated: boolean;
}) {
  const tone = PAGE_STATUS_TONE[entry.status];
  const views = stat?.views ?? null;
  const leads = stat?.leads ?? null;
  const cvr = stat?.conversion ?? null;
  const trend = stat?.viewTrend ?? [];

  // THE WHOLE CARD IS THE LINK. It regressed to a non-interactive article in
  // the shell rewrite; before that the card opened its live page. The target
  // is the entire card rather than the title alone — the preview is the thing
  // you actually point at, and a 300px card with a 14px hit area is a card you
  // miss.
  //
  // The iframe is pointer-events:none and aria-hidden, so it cannot swallow
  // the click or announce itself twice to a screen reader.
  const href = src ?? entry.path;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-app-border bg-app-card transition-colors duration-base ease-out focus-within:border-content hover:border-content">
      {src ? (
        <Frame src={src} title={entry.title} />
      ) : (
        <div className="flex w-full items-center justify-center rounded-t-lg border-b border-dashed border-app-border bg-surface [aspect-ratio:16/10]">
          <span className="font-sans text-ops-label text-content-subtle">no preview</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        {/* identity */}
        <div className="flex items-start gap-2">
          <span className="mt-[5px]">
            <StatusDot tone={tone} title={entry.status} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="m-0 truncate font-sans text-ops-body font-bold text-content">
              {/* The stretched link: covers the card, but stays a real anchor
                  with a real href so middle-click and copy-link behave. */}
              <Link
                href={href}
                className="no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline"
              >
                {entry.title}
              </Link>
            </h3>
            <p className="m-0 truncate font-mono text-ops-micro text-content-subtle">{entry.path}</p>
          </div>
          {variants !== undefined && <Chip tone="unknown">×{variants}</Chip>}
        </div>

        {/* the strip — views · leads · CVR */}
        <div className="mt-auto flex items-end gap-3 border-t border-app-border pt-2.5">
          <Figure
            label="Views"
            value={views === null ? DASH : views.toLocaleString("en-US")}
            tone={views === null ? "muted" : "default"}
          />
          <Figure
            label="Leads"
            value={leads === null ? DASH : leads.toLocaleString("en-US")}
            tone={leads === null ? "muted" : "default"}
          />
          <Figure
            label="CVR"
            value={cvr === null ? DASH : `${(cvr * 100).toFixed(2)}%`}
            tone={cvr === null ? "muted" : "default"}
            title={
              cvr !== null
                ? undefined
                : stat?.mismatch
                  ? "Withheld: more leads than views on this path — the lead/route join is wrong here, not the rate."
                  : truncated
                    ? "Withheld: the lead scan does not cover this timeframe."
                    : "No conversion rate yet."
            }
          />
          {trend.length > 1 && (
            <div className="flex-none pb-0.5">
              <Sparkline points={trend} bucket={bucket} width={64} height={22} />
            </div>
          )}
        </div>

        {/* Source line. Views is already stated above, so this does NOT repeat
            it — it names the source and holds the slot GA4 will fill, which is
            the honesty requirement (two sources, labelled, never averaged)
            without spending a second line on the same number. */}
        {/* z-10: these sit above the stretched link so the ⓘ stays clickable. */}
        <div className="relative z-10 flex items-center gap-1.5">
          <span className="font-sans text-ops-micro text-content-subtle">
            Views: Vercel · GA4 {DASH}
          </span>
          <InfoPopover label="How views are counted">{VIEW_SOURCES_NOTE}</InfoPopover>
          <span className="ml-auto flex items-center gap-1">
            {truncated && <Chip tone="unknown">partial</Chip>}
            {stat?.mismatch && <Chip tone="bad">join</Chip>}
          </span>
        </div>

        {note && <p className="m-0 truncate font-sans text-ops-micro text-content-subtle">{note}</p>}
      </div>
    </article>
  );
}
