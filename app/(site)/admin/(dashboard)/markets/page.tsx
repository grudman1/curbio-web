export { default, metadata } from "./MarketsPage";

// Segment config has to be declared on the route file itself, not re-exported
// from the implementation — the notes read is per-request.
export const dynamic = "force-dynamic";
