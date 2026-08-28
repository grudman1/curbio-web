import Link from "next/link";
import { Icon, type IconName } from "../Icon";

// Icon, one sentence, one optional action. Never mentions APIs, wiring, or
// file paths — that's what the "N things needed" pattern used to do, which
// this replaces (see StatCard's statusDot for the surface that still needs
// to say "not wired", just as a tooltip instead of an on-page list).

export function EmptyState({
  headline,
  icon = "inbox",
  action,
}: {
  /** One sentence. Not a paragraph. */
  headline: string;
  icon?: IconName;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-ui2-card border border-dashed border-ui2-border bg-ui2-card px-5 py-10 text-center">
      <span className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-ui2-well text-ui2-text-muted">
        <Icon name={icon} size={18} />
      </span>
      <p className="mx-auto m-0 max-w-[46ch] font-ui2 text-ui2-body text-ui2-text-muted">{headline}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center rounded-md bg-ui2-accent px-3 py-1.5 font-ui2 text-ui2-caption font-semibold text-white no-underline transition-opacity hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
