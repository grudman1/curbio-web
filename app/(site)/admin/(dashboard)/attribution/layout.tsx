import { ATTRIBUTION_TABS } from "@/config/adminNav";
import { SubTabs } from "../../_ui/SubTabs";

// Links, Forms and Contacts are instruments of attribution, not destinations
// beside it.
export default function AttributionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubTabs tabs={ATTRIBUTION_TABS} />
      {children}
    </>
  );
}
