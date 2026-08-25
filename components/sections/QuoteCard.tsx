// The quote card from the deal timeline (.cl-review) — serif blockquote with
// an amber left rule and a sans attribution.

export function QuoteCard({
  quote,
  attribution,
  compact = false,
}: {
  quote: React.ReactNode;
  attribution: string;
  /** The deal-timeline rail's smaller sizing. */
  compact?: boolean;
}) {
  return (
    <figure
      className="cl-review"
      style={compact ? { margin: "22px 0 0", padding: "20px 22px" } : undefined}
    >
      <blockquote style={compact ? { fontSize: 17, lineHeight: 1.5 } : undefined}>{quote}</blockquote>
      <figcaption>{attribution}</figcaption>
    </figure>
  );
}
