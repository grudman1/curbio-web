import { HomeHero } from "./HomeHero";
import { ProofBand } from "./ProofBand";
import { HowItWorks } from "./HowItWorks";
import { QualifyCard } from "./QualifyCard";
import { DealTimeline } from "./DealTimeline";
import { MoveInStats } from "./MoveInStats";
import { StatBand } from "@/components/sections/StatBand";
import { HomeResults } from "./HomeResults";
import { BeforeAfterProof } from "./BeforeAfterProof";
import { AudienceRouter } from "./AudienceRouter";
import { OurWork } from "./OurWork";
import { MarketsManagers } from "./MarketsManagers";
import { AppShowcase } from "./AppShowcase";
import { AwardsStrip } from "./AwardsStrip";
import { HomeCloser } from "./HomeCloser";

const BUYER_STATS = [
  { value: 94, suffix: "%", label: <>of buyers want move-in ready<sup>1</sup></> },
  { value: 25, prefix: "~", suffix: "%", label: <>more for a staged home<sup>1</sup></> },
  { value: 73, prefix: "~", suffix: "%", label: <>less time on market<sup>1</sup></> },
];

export function HomePage() {
  return (
    <>
      <HomeHero />
      <div className="c-home-sections">
        <ProofBand />
        <HowItWorks />
        <BeforeAfterProof />
        <HomeResults />
        <QualifyCard />
        <DealTimeline />
        <MoveInStats />
        <StatBand
          id="buyer-stats"
          label="What buyers reward"
          stats={BUYER_STATS}
          footnote={<><sup>1</sup> Sources being supplied separately.</>}
        />
        <AudienceRouter />
        <OurWork />
        <MarketsManagers />
        <AppShowcase />
        <AwardsStrip />
      </div>
      <HomeCloser />
    </>
  );
}
