import type { Metadata } from "next";
import { GiveawayPage } from "@/components/giveaway/GiveawayPage";
import { expcon } from "@/config/giveaways/expcon";
import { routeMetadata } from "@/config/routes";
import { isClosed } from "@/lib/giveaway/mode";

// EVENT tier — eXpcon Salt Lake City 2026. An event-themed sibling of /exp,
// mounted beside it for the same reason /exp is not under /lp/: it lives at
// the path the printed short link uses (curbio.com/expcon), so when curbio.com
// moves onto this app the QR codes already in the world resolve to this route
// with no redirect for anyone to remember.
//
// Unlike /exp it is NOT the campaign template — see
// components/giveaway/GiveawayPage.tsx for why — and unlike /exp it never
// becomes indexable: config/routes.ts keeps it noindex for good.
//
// Static, re-generated at most once a minute. The page's copy changes when the
// entry period ends, and `revalidate` is what lets the prerendered HTML catch
// up; the client flips at the exact instant on its own (GiveawayShell). Nothing
// here reads searchParams, headers or cookies, so it stays on the CDN — which
// matters for a page reached from a conference hall's Wi-Fi.
export const revalidate = 60;

// The tab title and the link preview follow the page: once the entry period has
// ended they stop inviting people to enter. Regenerated with the page, so they
// catch up within the same minute.
//
// The link preview is set EXPLICITLY. The root layout declares Open Graph and
// Twitter tags for the whole site, and a page that sets only `title` inherits
// them — so a shared link read "Curbio — Get your home market-ready" whatever
// the tab said. (Found 2026-10-02: the first version of this page relied on the
// title alone.)
export function generateMetadata(): Metadata {
  const { title, description } = isClosed(expcon) ? expcon.metaClosed : expcon.meta;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
    ...routeMetadata(expcon.path),
  };
}

export default function ExpconPage() {
  return <GiveawayPage giveaway={expcon} />;
}
