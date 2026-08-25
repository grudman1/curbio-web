import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import "@/components/site/site.css";

// Global site chrome — the approved homepage header/footer, promoted.
//
// This is a NESTED group inside (site) rather than the (site) layout itself,
// because two things live in the site group that must NOT get site chrome:
//
//   /exp            partner pages render their own CO-BRANDED header
//                   (ExpShell). Site chrome on top would mean two headers on a
//                   live page — a partner page is co-branded, not site-chromed.
//   /admin etc.     internal surfaces carry their own chrome.
//
// Anything that should carry the standard header/footer goes under (chrome).
// Anything with its own chrome stays a sibling of it.
//
// NOTE: the header is position:fixed (the approved design), so it does NOT
// push content down. Pages that open with a full-bleed hero handle that
// themselves; ordinary pages start with a section that carries header
// clearance (.c-pagehead in site.css).
export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="c-page">
      <SiteHeader />
      {/* Target for the header's skip link. */}
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
