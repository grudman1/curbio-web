import { HeroCopyBody } from "./HeroCopyBody";
import { RichText } from "./campaign/RichText";
import { Eyebrow } from "./LpKit";
import type { CampaignPage } from "@/config/campaigns/types";

// The real hero copy for a prerendered skeleton — or null when it can't be
// known before market resolution.
//
// Any {market} token in the headline, subhead or trust row means that copy
// depends on the visitor's market, so the skeleton keeps its grey bars rather
// than shipping text that would change on resolve. Today neither /lp/sell nor
// /exp has one; a future campaign that does gets the old skeleton for free.
export function skeletonHeroCopy(hero: CampaignPage["hero"] | undefined): React.ReactNode | null {
  if (!hero) return null;
  const texts = [hero.headline, hero.sub, ...(hero.trust ?? [])];
  if (texts.some((t) => typeof t === "string" && t.includes("{market}"))) return null;
  return (
    <HeroCopyBody
      headline={<RichText>{hero.headline}</RichText>}
      heroSub={<RichText>{hero.sub}</RichText>}
      trust={hero.trust}
      phone={hero.phone}
    />
  );
}

/** Grey bar the exact size of the real eyebrow: the neutral eyebrow text in the
 *  real <Eyebrow>, made invisible. The market version replaces it on resolve
 *  without moving the headline below it. */
export function SkeletonEyebrow({ hero }: { hero: CampaignPage["hero"] }) {
  return (
    <div aria-hidden>
      <Eyebrow
        style={{ marginBottom: 18, color: "transparent", background: "var(--stone)", borderRadius: 4, width: "fit-content" }}
      >
        <RichText>{hero.eyebrow.neutral}</RichText>
      </Eyebrow>
    </div>
  );
}
