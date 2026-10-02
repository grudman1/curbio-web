import type { Metadata } from "next";
import { GiveawayPage } from "@/components/giveaway/GiveawayPage";
import { expcon } from "@/config/giveaways/expcon";
import { routeMetadata } from "@/config/routes";
import { isClosed } from "@/lib/giveaway/mode";

// EVENT tier — eXpcon Salt Lake City 2026. An event-themed sibling of /exp,
// mounted beside it for the same reason /exp is not under /lp/: it lives at
// the address the printed QR code encodes (sell.curbio.com/expcon, with no
// redirect and no tags), so the ink keeps resolving here for good.
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

// The picture in a shared link (iMessage, Slack, LinkedIn): public/og/expcon.png,
// 1200×630, the prize only. ABSOLUTE on sell.curbio.com on purpose: the site's
// metadataBase is curbio.com, which still serves WordPress, so a relative URL
// would point at a file that is not there. Without an image at all, apps pick
// the biggest photo on the page (it was an Atlanta house). To re-make it, see
// docs/expcon/README.md, "The share image".
const SHARE_IMAGE = {
  url: "https://sell.curbio.com/og/expcon.png",
  width: 1200,
  height: 630,
  alt: "Win the Listing-Ready Kit: AirPods, a $100 Amazon gift card, a Curbio duffel, tumbler and notepad.",
};

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
    openGraph: { title, description, type: "website", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE.url] },
    ...routeMetadata(expcon.path),
  };
}

export default function ExpconPage() {
  return <GiveawayPage giveaway={expcon} />;
}
