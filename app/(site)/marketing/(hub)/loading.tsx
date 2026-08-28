import { ScreenSkeleton } from "@/app/(site)/admin/_ui/Skeleton";

// Legacy /marketing chrome shares the app skeleton — no blank flashes there
// either.
export default function HubLoading() {
  return <ScreenSkeleton />;
}
