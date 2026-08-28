import Link from "next/link";
import type { FormRegistryEntry } from "@/config/formRegistry";
import { DASH, Eyebrow, StatusDot } from "./primitives";

// The Forms registry card — same job as PageCard, no live preview: a form has
// no URL of its own to render, so the identity here is the name and the
// delivery contract, not a screenshot. Every figure is an honest em-dash
// until /api/intake exists (config/marketingHub.ts HUB_SURFACES.forms.needs);
// this card exists so the registry is real before the data is.

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <Eyebrow className="block truncate whitespace-nowrap">{label}</Eyebrow>
      <div className="mt-0.5 truncate font-sans text-ops-body font-bold tabular-nums text-content-subtle">
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate font-sans text-ops-micro text-content-subtle">{sub}</div>}
    </div>
  );
}

export function FormCard({ entry }: { entry: FormRegistryEntry }) {
  return (
    <article className="group relative flex flex-col gap-2.5 rounded-lg border border-app-border bg-app-card p-3 transition-colors duration-base ease-out hover:border-content focus-within:border-content">
      <div className="flex items-start gap-2">
        <span className="mt-[5px]">
          <StatusDot tone="unknown" title="not wired yet" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate font-sans text-ops-body font-bold text-content">
            <Link
              href={`/admin/site/forms/${entry.slug}`}
              className="no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline"
            >
              {entry.label}
            </Link>
          </h3>
          <p className="m-0 truncate font-sans text-ops-micro text-content-subtle">
            {entry.deliversAsset ? "delivers an asset on submit" : "no asset delivered"}
          </p>
        </div>
      </div>

      {/* Two columns, not three: "Submitted"/"Delivered" fit at 11px caps
          where a third narrower column made both wrap and overlap. Last
          submission rides under the count instead — it's a detail of "how
          many", not its own stat. */}
      <div className="mt-auto flex items-start gap-4 border-t border-app-border pt-2.5">
        <Figure label="Submitted" value={DASH} sub="last —" />
        <Figure label="Delivered" value={entry.deliversAsset ? DASH : "n/a"} />
      </div>
    </article>
  );
}
