import type { Metadata } from "next";

// The share tier of the Marketing Hub: the read-only Executive review behind
// a single env-configured token, sent or projected without the admin
// password. No sidebar, no toggles, larger base type, and a print stylesheet
// — the page itself is the whole document.

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Marketing review — Curbio",
  robots: { index: false, follow: false },
};

const SHARE_CSS = `
.mk-share { min-height: 100vh; background: var(--color-surface); color: var(--color-text); font-family: var(--font-sans); }
.mk-share-main { max-width: 960px; margin: 0 auto; padding: 48px 32px 96px; }
.mk-share-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 40px; }
@media (max-width: 719px) { .mk-share-main { padding: 28px 18px 64px; } }
@media print {
  .mk-share { background: #fff; }
  .mk-share-main { max-width: none; padding: 0; }
  section { break-inside: avoid; }
}
`;

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk-share">
      <style>{SHARE_CSS}</style>
      <main className="mk-share-main">
        <header className="mk-share-head">
          <span
            style={{
              fontFamily: "var(--font-family-sans)",
              fontSize: "var(--text-micro)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-text-subtle)",
            }}
          >
            Curbio
          </span>
          <span
            style={{
              fontFamily: "var(--font-family-serif)",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "var(--tracking-heading)",
            }}
          >
            Marketing review
          </span>
        </header>
        {children}
      </main>
    </div>
  );
}
