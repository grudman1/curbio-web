// Campaign group layout — deliberately a PASS-THROUGH.
//
// Campaign chrome (header, sticky bar, footer) is rendered inside the page
// components themselves: PageShell → LpSections.Header, ConfirmShell, etc.
// Rendering any header or footer here would give every campaign page two of
// them. The group exists to separate these routes from the site group and to
// let each own its layout independently later — not to add chrome now.
//
// If campaign-wide chrome is ever wanted, it belongs HERE and must be removed
// from PageShell/ExpShell in the same change, never added alongside them.
export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
