// Site group layout — curbio.com proper.
//
// The global header and footer land here in Task 3, driven entirely by
// config/navigation.ts. Until then this is a pass-through so the partner
// pages that already live in this group (/exp and its per-market rewrite
// targets) render EXACTLY as they did before the restructure — adding chrome
// here would change live, converting pages before their design exists.
//
// The partner pages render their own co-branded header (ExpShell), which is
// intentional and stays: a partner page is co-branded, not site-chromed.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
