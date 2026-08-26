import Link from "next/link";
import { Eyebrow } from "./primitives";

// One line and one action. Used for every unwired surface.
//
// The five "Not wired" Hub screens (contacts, forms, partners, outreach,
// events) render this with their documented `needs` list from
// config/marketingHub.ts as the body. That list IS the build backlog — it
// stays visible rather than being buried, which is why those routes were
// parked instead of cut.

export function EmptyState({
  headline,
  action,
  needs,
}: {
  /** One sentence. Not a paragraph. */
  headline: string;
  action?: { label: string; href: string };
  /** What must exist before this surface can show real numbers. */
  needs?: readonly string[];
}) {
  return (
    <div className="rounded-lg border border-dashed border-edge bg-surface-raised px-ops-panel py-8 text-center">
      <p className="mx-auto m-0 max-w-[46ch] font-sans text-ops-body text-content-muted">
        {headline}
      </p>

      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex rounded-pill bg-accent px-4 py-[6px] font-sans text-ops-label font-bold text-content-on-accent no-underline transition-colors duration-base ease-out hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {action.label}
        </Link>
      )}

      {needs && needs.length > 0 && (
        <div className="mx-auto mt-6 max-w-[52ch] text-left">
          <Eyebrow>Needs</Eyebrow>
          <ol className="m-0 mt-2 list-decimal pl-5 font-sans text-ops-label leading-[1.7] text-content-muted">
            {needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
