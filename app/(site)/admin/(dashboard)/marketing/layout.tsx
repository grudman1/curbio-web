import { HubNav } from "./HubNav";

// Marketing Hub shell — the sub-nav above every Hub page. Auth, header, alert
// banner, and the Control Room tabs all come from the (dashboard) layout;
// this layer adds only the Hub's own navigation.

export default function MarketingHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HubNav />
      {children}
    </>
  );
}
