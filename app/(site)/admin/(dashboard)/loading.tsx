import { ScreenSkeleton } from "../_ui/Skeleton";

// Route-group loading state — every /admin screen shows the skeleton while
// its server component fetches, never a blank flash.
export default function AdminLoading() {
  return <ScreenSkeleton />;
}
