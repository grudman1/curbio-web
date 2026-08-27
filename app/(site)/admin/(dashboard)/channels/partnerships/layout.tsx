import { PARTNERSHIP_TABS } from "@/config/adminNav";
import { SubTabs } from "../../../_ui/SubTabs";

// Partnerships carries its working views as TABS. Outreach is how the channel
// gets done and Call plan is its queue — neither is a peer of the channel.
export default function PartnershipsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubTabs tabs={PARTNERSHIP_TABS} />
      {children}
    </>
  );
}
