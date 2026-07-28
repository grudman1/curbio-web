import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Global site chrome.
//
// This is a NESTED group inside (site) rather than the (site) layout itself,
// because two things live in the site group that must NOT get site chrome:
//
//   /exp            partner pages render their own CO-BRANDED header
//                   (ExpShell). Site chrome on top would mean two headers on a
//                   live page — a partner page is co-branded, not site-chromed.
//   /design-system  a token reference, not a site page. It is also the surface
//                   you would use to inspect chrome in isolation, which the
//                   real header wrapping it would defeat.
//
// Anything that should carry the standard header/footer goes under (chrome).
// Anything with its own chrome stays a sibling of it.
export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {/* Target for the header's skip link. */}
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
