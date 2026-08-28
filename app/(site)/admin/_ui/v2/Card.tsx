import Link from "next/link";

// White card, 12px radius, hairline shadow — the one container every v2
// screen composes from. `flush` drops body padding for a card whose content
// is a full-bleed table.

export function Card({
  title,
  titleClassName = "",
  right,
  children,
  className = "",
  flush = false,
  headerHref,
}: {
  title?: string;
  /** Override the default 16px/600 title size for a screen that wants this
   *  card's heading to read at a different weight in the hierarchy. */
  titleClassName?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
  /**
   * When set, ONLY the header row (title + right) is a link — not the whole
   * card. Home's trend card used to wrap its entire body in a Link to
   * Performance, which meant a click meant to explore the chart's own bars
   * navigated away instead. The header row already reads as a link (the
   * "Performance ›" text in `right` says so), so that's where navigation
   * belongs; the content below stays interactive on its own terms.
   */
  headerHref?: string;
}) {
  const header = (title || right) && (
    <div className={`flex items-center justify-between gap-3 ${flush ? "px-5 pt-5 pb-3" : "mb-3"}`}>
      {title ? (
        <h2
          className={`m-0 font-ui2 font-semibold text-ui2-text ${titleClassName || "text-ui2-section"} ${
            headerHref ? "group-hover:text-ui2-accent" : ""
          }`}
        >
          {title}
        </h2>
      ) : (
        <span />
      )}
      {right}
    </div>
  );

  return (
    <section
      className={`rounded-ui2-card border border-ui2-border bg-ui2-card shadow-ui2-card ${
        flush ? "overflow-hidden" : "p-5"
      } ${className}`}
    >
      {header &&
        (headerHref ? (
          <Link
            href={headerHref}
            className="group block rounded-md no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui2-accent"
          >
            {header}
          </Link>
        ) : (
          header
        ))}
      {children}
    </section>
  );
}
