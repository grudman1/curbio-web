// Layout-matching skeleton for the /exp co-branded page. Rendered into the
// prerendered HTML of /exp (see components/ExpHomeClient.tsx), so it IS the
// first paint for visitors who need client-side resolution.
export default function ExpPageSkeleton() {
  return (
    <div aria-hidden>
      <header className="lp-header">
        <div className="lp-shell lp-header-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="exp-header-logos">
            <img src="/logo/curbio-white.svg" alt="Curbio" className="lp-header-logo" width={100} height={26} />
            <div style={{ width: 1, height: 22, background: "var(--navy-85)" }} />
            <div style={{ height: 20, width: 120, background: "var(--navy-85)", borderRadius: 3 }} />
          </div>
          <div style={{ height: 32, width: 140, background: "var(--navy-85)", borderRadius: 999 }} />
        </div>
      </header>
      <main>
        <section className="lp-hero">
          <div className="lp-shell lp-hero-grid">
            <div className="lp-hero-copy">
              <div style={{ height: 14, width: 160, background: "var(--stone)", borderRadius: 4, marginBottom: 18 }} />
              <div style={{ height: 100, width: "85%", background: "var(--stone)", borderRadius: 6, marginBottom: 22 }} />
              <div style={{ height: 44, width: "65%", background: "var(--stone)", borderRadius: 4 }} />
            </div>
            <div className="lp-hero-form-col">
              <div style={{ height: 480, background: "var(--stone)", borderRadius: 12 }} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
