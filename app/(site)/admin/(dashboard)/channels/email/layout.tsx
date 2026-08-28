import { EMAIL_TABS } from "@/config/adminNav";
import { SubTabs } from "../../../_ui/SubTabs";

// Email carries its database as a TAB (2026-08 nav redesign) — the contact
// pool ActiveCampaign/Instantly fill is a working view of the channel, not a
// peer of it. Static route, same reason as Partnerships: a static segment
// shadows the dynamic [slug] route.
export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubTabs tabs={EMAIL_TABS} />
      {children}
    </>
  );
}
