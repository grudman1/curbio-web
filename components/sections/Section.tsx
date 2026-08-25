// The section shell — the promoted homepage design language's building blocks.
//
// Every page under (chrome) is assembled from these, not from new one-off
// components. Class names are the promoted homepage families in
// components/site/site.css; nothing here invents a style.

// No sage/green: the site's ground is white and cloud, and stone is the one
// call-out colour (Gavin, Aug 25).
type SectionVariant = "default" | "stone" | "white" | "inverse";

const VARIANT_CLASS: Record<SectionVariant, string> = {
  default: "c-sect",
  stone: "c-sect c-sect--stone",
  white: "c-sect c-sect--white",
  inverse: "c-sect c-sect--inverse",
};

/**
 * A full-width page section with the site's vertical rhythm. `dark` marks the
 * section for the fixed header's frosted-navy tone (any [data-dark] section
 * does — see SiteHeader).
 */
export function Section({
  variant = "default",
  tightTop = false,
  id,
  dark = false,
  children,
}: {
  variant?: SectionVariant;
  /** Tighter lead-in for a section that follows a thin band. */
  tightTop?: boolean;
  id?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-dark={dark || undefined}
      className={`${VARIANT_CLASS[variant]}${tightTop ? " c-sect--tight-top" : ""}`}
    >
      <div className="c-container">{children}</div>
    </section>
  );
}

/** The site's max-width container, for layouts that can't use Section. */
export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`c-container${className ? ` ${className}` : ""}`}>{children}</div>;
}

/** Eyebrow + serif heading + optional lede — the standard section opener. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <>
      {eyebrow && <p className="c-eyebrow">{eyebrow}</p>}
      <Tag className="c-h2" style={{ maxWidth: "16em" }}>
        {title}
      </Tag>
      {lede && (
        <p className="c-lede" style={{ marginTop: 20 }}>
          {lede}
        </p>
      )}
    </>
  );
}

/**
 * Interior page opener: clears the fixed header, then eyebrow + h1 + lede.
 * Pages that start with a full-bleed hero don't use this — the hero itself
 * clears the header.
 */
export function PageHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
}) {
  return (
    <div className="c-pagehead">
      <div className="c-container">
        {eyebrow && <p className="c-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lede && <p className="c-lede">{lede}</p>}
      </div>
    </div>
  );
}
