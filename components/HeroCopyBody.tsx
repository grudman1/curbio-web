import { Icon, AmberRule } from "./LpKit";

// The market-independent half of the landing-page hero: headline, rule,
// subhead, trust row, optional phone. ONE markup, rendered by both the real
// Hero (components/LpSections.tsx) and the prerendered skeletons
// (PageSkeleton / ExpPageSkeleton), so the first paint already holds the real
// headline — the LCP element — and the swap to the resolved page cannot move
// or restyle it.
//
// Kept out of LpSections on purpose: the skeletons render inside server
// components, and this file must stay free of client-only imports to do that.
// Everything market-dependent (eyebrow, header picker, form) stays with the
// caller.
export function HeroCopyBody({
  headline,
  heroSub,
  trust,
  phone,
}: {
  headline?: React.ReactNode;
  heroSub?: React.ReactNode;
  trust?: [string, string, string];
  phone?: { display: string; tel: string };
}) {
  return (
    <>
      <h1 className="lp-hero-h1">
        {headline ?? (
          <>
            We do the <em>prep.</em>
            <br />
            You make the <em>sale.</em>
            <br />
            Seller pays <em>at close.</em>
          </>
        )}
      </h1>
      <AmberRule width={48} style={{ margin: "22px 0" }} />
      <p className="lp-hero-sub">
        {heroSub ?? "Move-in ready sells. Your seller pays nothing until it closes."}
      </p>
      <div className="lp-hero-trust">
        <span className="lp-sold-proof">
          <Icon name="home" size={12} color="var(--fg-muted)" stroke={2} />
          {trust?.[0] ?? "8,000+ homes prepped"}
        </span>
        <span className="lp-sold-proof-dot" aria-hidden>·</span>
        <span className="lp-sold-proof">
          <Icon name="shield" size={12} color="var(--fg-muted)" stroke={2} />
          {trust?.[1] ?? "1-year warranty"}
        </span>
        <span className="lp-sold-proof-dot" aria-hidden>·</span>
        <span className="lp-sold-proof">
          <Icon name="check" size={12} color="var(--fg-muted)" stroke={2.5} />
          {trust?.[2] ?? "Licensed & insured"}
        </span>
      </div>
      {phone && (
        <p className="lp-hero-phone">
          Prefer to talk it through?{" "}
          <a href={`tel:${phone.tel}`}>{phone.display}</a>
        </p>
      )}
    </>
  );
}
