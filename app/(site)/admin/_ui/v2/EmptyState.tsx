import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Nothing to show yet.
//
// One line, optionally one link, quiet rather than boxed: an empty section is a
// fact, not an error, and it should not out-shout the sections that do have
// data. The v1 EmptyState carried a `needs` list that rendered as prose ("needs
// a spend store to unlock") — that is exactly the coaching text this system
// does not have a slot for. What is missing is said by a HealthDot's tooltip,
// or it is not said.
// ─────────────────────────────────────────────────────────────────────────────

export function EmptyState({
  headline,
  action,
  ruled = false,
}: {
  /** One line. Not a paragraph, and not an instruction. */
  headline: string;
  action?: { label: string; href: string };
  /** Hairline above, for an empty state that sits inside a card body. */
  ruled?: boolean;
}) {
  return (
    <div className={`ops-empty${ruled ? " ops-empty--ruled" : ""}`}>
      <span>{headline}</span>
      {action && (
        <Link href={action.href} className="ops-foot-link">
          {action.label} ›
        </Link>
      )}
    </div>
  );
}
