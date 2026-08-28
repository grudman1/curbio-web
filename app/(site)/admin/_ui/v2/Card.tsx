// White card, 12px radius, hairline shadow — the one container every v2
// screen composes from. `flush` drops body padding for a card whose content
// is a full-bleed table.

export function Card({
  title,
  right,
  children,
  className = "",
  flush = false,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={`rounded-ui2-card border border-ui2-border bg-ui2-card shadow-ui2-card ${
        flush ? "overflow-hidden" : "p-5"
      } ${className}`}
    >
      {(title || right) && (
        <div className={`flex items-center justify-between gap-3 ${flush ? "px-5 pt-5 pb-3" : "mb-3"}`}>
          {title ? (
            <h2 className="m-0 font-ui2 text-ui2-section font-semibold text-ui2-text">{title}</h2>
          ) : (
            <span />
          )}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
