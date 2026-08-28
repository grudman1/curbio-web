import Link from "next/link";
import { Icon, type IconName } from "./Icon";
import { buttonClass } from "./Button";

// One icon, one sentence, one action. Used for every unwired surface and
// every empty table.
//
// The `needs` list from config/marketingHub.ts IS the build backlog — it
// survives, collapsed behind one line, which is why those routes were parked
// instead of cut.

export function EmptyState({
  headline,
  icon = "inbox",
  action,
  needs,
}: {
  /** One sentence. Not a paragraph. */
  headline: string;
  icon?: IconName;
  action?: { label: string; href: string };
  /** What must exist before this surface can show real numbers. */
  needs?: readonly string[];
}) {
  return (
    <div className="rounded-lg border border-dashed border-app-border-strong bg-app-card px-ops-panel py-10 text-center">
      <span className="mx-auto mb-3 flex h-[36px] w-[36px] items-center justify-center rounded-lg bg-app-well text-content-subtle">
        <Icon name={icon} size={18} />
      </span>
      <p className="mx-auto m-0 max-w-[46ch] font-sans text-ops-body text-content-muted">
        {headline}
      </p>

      {action && (
        <Link href={action.href} className={`mt-4 ${buttonClass("primary", "sm")}`}>
          {action.label}
        </Link>
      )}

      {needs && needs.length > 0 && (
        <details className="mx-auto mt-5 max-w-[52ch] text-left">
          <summary className="cursor-pointer list-none text-center font-sans text-ops-label font-semibold text-content-subtle hover:text-content">
            {needs.length} {needs.length === 1 ? "thing" : "things"} needed
          </summary>
          <ol className="m-0 mt-2 list-decimal pl-5 font-sans text-ops-label leading-[1.7] text-content-muted">
            {needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
