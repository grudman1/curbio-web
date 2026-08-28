import type { Metadata } from "next";
import { routeMetadata } from "@/config/routes";
import { PageHead, Section, SectionHeading } from "@/components/sections/Section";
import { CtaCloser } from "@/components/sections/CtaCloser";
import { CountUp } from "@/components/sections/CountUp";
import { ScrollProgress } from "@/components/sections/ScrollProgress";
import { SoldTicker } from "@/components/sections/SoldTicker";
import { StepRail, type RailStep } from "@/components/sections/StepRail";
import { ScopePicker } from "@/components/sections/ScopePicker";
import { BeforeAfterSlider } from "@/components/sections/BeforeAfterSlider";
import { Faq, type FaqItem } from "@/components/sections/Faq";
import { StickyCta } from "@/components/sections/StickyCta";
import { StatBand } from "@/components/sections/StatBand";
import { MARKETS } from "@/config/markets";
import { DealTimeline } from "@/components/home/DealTimeline";
import { QualifyCard } from "@/components/home/QualifyCard";

// ─────────────────────────────────────────────────────────────────────────────
// /how-it-works — the interactive rebuild (Gavin, Aug 25), from the standalone
// mockup in curbio-how-it-works_1.html.
//
// ORDER, and the argument it makes:
//   ticker → five steps (sticky rail) → what it costs (scope picker) →
//   before/after → one real deal → side by side → FAQs → the numbers →
//   pay at closing → closer
//
// The numbers band sits LATE on purpose, same as the mockup: at the top it
// answers "what is this", which the page has not asked yet; after the FAQs it
// answers "should I", which is the question a reader actually arrives at.
//
// WHERE THIS DEPARTS FROM THE MOCKUP, deliberately:
//
//   • The mockup ships its own <nav>. This page inherits the site header, so
//     that is dropped rather than duplicated.
//   • The ticker rotated INVENTED projects ("Project 8,214 · Bethesda, MD").
//     Ours rotates real closings out of config/markets.ts. See SoldTicker.
//   • The deal figures are OURS, not the mockup's. It moved the address to
//     Middletown, restated the sale as "listed Aug 2025", and altered four
//     line items (carpet 4,008 → 4,908 among them). The repo's come from the
//     signed contract, so the repo's stand and <DealTimeline /> is reused.
//   • The before/after faked "before" by greyscaling the after photo. Ours
//     uses the real pair already on disk.
//
// ⚠️ The scope picker's dollar ranges are PLACEHOLDERS — see the header of
// config/scopeRanges.ts. They render with an "illustrative only" notice until
// real project percentiles replace them.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "How It Works — Curbio",
  description:
    "How Curbio gets a home market-ready: a local project manager, one fixed price, licensed trades, and nothing due until the home closes.",
  ...routeMetadata("/how-it-works"),
};

const STEPS: RailStep[] = [
  {
    id: "step-walk",
    num: "01",
    rail: "Walk the property",
    when: "Day 1",
    title: "A local project manager walks the property",
    body: "Request a proposal by phone or online. You meet the project manager who will run the whole job — walkthrough to closing — and they walk the home with you, your seller, or both.",
    tags: ["In person or video", "Same PM start to finish", "No cost to look"],
    link: { href: "/contact", label: "Start with your address" },
    media: { src: "/home/how/01-win-the-listing.jpg", alt: "An agent showing sellers a Curbio plan on a tablet in their kitchen" },
    inset: { src: "/hsm/joshua-collins.jpg", alt: "Joshua Collins, Home Services Manager" },
  },
  {
    id: "step-price",
    num: "02",
    rail: "Get a fixed price",
    when: "After the walkthrough",
    title: "You get a fixed price, not an estimate",
    body: "Every line is priced up front — labor, materials, fixtures, appliances. Nothing is left as an allowance to be settled later, so the number your seller approves is the number they pay.",
    tags: ["Line-by-line scope", "No allowances", "Change it before you sign"],
    link: { href: "#what-it-costs", label: "See what a typical scope covers" },
    media: { src: "/home/how/caminito-herminia-kitchen.jpg", alt: "A kitchen scoped for pre-listing updates" },
  },
  {
    id: "step-approve",
    num: "03",
    rail: "Approve and sign",
    when: "Same week",
    title: "Agent and seller approve it",
    body: "The seller signs one plain-language contract. It covers the full scope, licensed local trades, permits, materials, and project management. You stay in the loop without holding the pen.",
    tags: ["One contract", "Seller decides the scope", "Agent stays informed"],
    media: { src: "/home/how/03-pay-at-close.jpg", alt: "Sellers reviewing and signing the project scope with their agent" },
  },
  {
    id: "step-work",
    num: "04",
    rail: "Watch the work happen",
    when: "During the work",
    title: "Your PM runs it. You watch from your phone.",
    body: "Your project manager holds the schedule, the licensed trades, and the permits — so your seller never chases a contractor and you never become the de facto GC. Photos and updates live in the Curbio app.",
    tags: ["Licensed & insured trades", "Photo updates", "Direct line to your PM"],
    media: { src: "/home/how/02-we-do-the-work.jpg", alt: "Curbio crews replacing a window on a home exterior" },
  },
  {
    id: "step-close",
    num: "05",
    rail: "List, sell, pay at close",
    when: "At the closing table",
    title: "List, sell, and pay from the proceeds",
    body: "The home goes live finished, photographed, and ready for buyers. Curbio is paid out of the sale — nothing is due until the home closes — and the work carries a one-year warranty.",
    tags: ["$0 until closing", "1-year warranty", "No monthly payments"],
    link: { href: "#one-real-deal", label: "See how one deal actually ran" },
    media: { src: "/home/deal/6906-deer-run-after.jpg", alt: "6906 Deer Run Lane, finished and ready to list" },
  },
];

const COMPARISON: { label: string; curbio: string; traditional: string }[] = [
  {
    label: "Paying for the work",
    curbio: "Nothing until closing — paid from the proceeds.",
    traditional: "Deposit up front, progress payments along the way.",
  },
  {
    label: "The estimate",
    curbio: "One fixed price, approved before work starts.",
    traditional: "Open bids and change orders as the job moves.",
  },
  {
    label: "Who manages it",
    curbio: "A dedicated Curbio project manager.",
    traditional: "The seller — or the agent, off the side of their desk.",
  },
  {
    label: "Scheduling",
    curbio: "Sequenced against the listing date, from day one.",
    traditional: "Whenever the crew has room.",
  },
  {
    label: "The trades",
    curbio: "Licensed and insured, vetted under one contract.",
    traditional: "Found, vetted, and coordinated by the homeowner.",
  },
  {
    label: "After the work",
    curbio: "One-year warranty on everything completed.",
    traditional: "Varies by contractor — often nothing in writing.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Who decides which updates get done?",
    a: "The homeowner does. Agents usually recommend the updates they know will sell, and Curbio adds what it has seen work across thousands of pre-sale projects — but the seller signs off on the final scope.",
  },
  {
    q: "What happens if something is found mid-project?",
    a: "Your project manager prices it and brings it to the seller for approval before any work happens. Nothing gets added without a signature — at 6906 Deer Run, rot behind the old siding was found, priced, and repaired the same week.",
  },
  {
    q: "How small a job will Curbio take?",
    a: "From a punch list of inspection repairs to a whole-home renovation. Small jobs get the same fixed price and the same project manager.",
  },
  {
    q: "Who are the people doing the work?",
    a: "Project managers are Curbio employees. The trades are a vetted local network, licensed and insured to local requirements, working under Curbio's contract rather than the seller's.",
  },
  {
    q: "What if the home doesn't sell?",
    a: "Payment is tied to closing, so this is the question to ask before signing. Your project manager will walk through the terms in plain language, including what happens if the listing is withdrawn or expires.",
  },
  {
    q: "Does Curbio warranty the work?",
    a: "Yes — one year on everything completed.",
  },
];

// The three staging figures. NEEDS FACT: the sourcing footnote is still a
// placeholder — these numbers may not ship as claims until the sources are
// supplied. They travelled here from the homepage; the marker travelled with
// them rather than being quietly dropped en route.
const BUYER_STATS = [
  { value: 94, suffix: "%", label: <>of buyers want move-in ready<sup>1</sup></> },
  { value: 25, prefix: "~", suffix: "%", label: <>more for a staged home<sup>1</sup></> },
  { value: 73, prefix: "~", suffix: "%", label: <>less time on market<sup>1</sup></> },
];

export default function HowItWorksPage() {
  return (
    <>
      <ScrollProgress />

      <PageHead
        eyebrow="How it works"
        title={
          <>
            From listing appointment to <span className="c-accent">closing table.</span>
          </>
        }
        lede="Five steps. One partner. Nothing paid until the home sells."
      />
      <div className="c-container">
        <SoldTicker />
      </div>

      <Section id="steps" tightTop>
        <StepRail steps={STEPS} />
      </Section>

      {/* Navy, because this is the page's one interactive call-out. */}
      <Section variant="inverse" id="what-it-costs">
        <SectionHeading
          eyebrow="Ballpark it"
          title={
            <>
              What would <span className="c-accent">this listing</span> need?
            </>
          }
          lede="Tap what the home needs. You'll see a typical range before anyone visits — your fixed price still comes from the walkthrough."
        />
        <ScopePicker />
      </Section>

      {/* Cloud, not white: the deal record immediately after is the page's
          white beat, and two white sections back to back read as one. */}
      <Section id="before-after">
        <SectionHeading
          eyebrow="Before / after"
          title={
            <>
              Drag to see the <span className="c-accent">difference.</span>
            </>
          }
        />
        <BeforeAfterSlider
          before={{ src: "/home/deal/6906-deer-run-before.jpg", alt: "6906 Deer Run Lane before — worn siding and a mossy roof" }}
          after={{ src: "/home/deal/6906-deer-run-after.jpg", alt: "6906 Deer Run Lane after — new roof, new siding, refreshed porch" }}
          caption="6906 Deer Run Lane. Drag the handle, or use the arrow keys."
        />
      </Section>

      {/* WHAT BUYERS REWARD — relocated here from the homepage with the
          listing-operations rebuild. These are seller-facing why-prep numbers:
          they argue that prepped homes sell better, which is the question THIS
          page answers and the one the homepage deliberately no longer asks
          (agents already know it; what they weigh is why Curbio). Sits under
          the before/after slider, where the drag has just shown the change the
          figures are about. */}
      <StatBand
        id="buyer-stats"
        label="What buyers reward"
        stats={BUYER_STATS}
        footnote={
          <>
            <sup>1</sup> Sources being supplied separately.
          </>
        }
      />

      {/* The real deal record — verified against the signed contract. */}
      <div id="one-real-deal">
        <DealTimeline />
      </div>

      <Section id="side-by-side">
        <SectionHeading
          title={
            <>
              Curbio, next to the way it&rsquo;s <span className="c-accent">usually done.</span>
            </>
          }
          lede="Most sellers have exactly one alternative: find a contractor, front the money, and run the project themselves while trying to move."
        />
        <div className="c-compare-wrap">
          <table className="c-compare">
            <thead>
              <tr>
                <th scope="col">&nbsp;</th>
                <th scope="col">With Curbio</th>
                <th scope="col">Traditional contractor</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.curbio}</td>
                  <td>{row.traditional}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section variant="white" id="faq">
        <SectionHeading eyebrow="Before you ask" title="Common questions" />
        <Faq items={FAQS} />
      </Section>

      {/* Late on purpose — see the note at the top of this file. */}
      <Section variant="stone" id="by-the-numbers">
        <ul className="c-numbers">
          <li>
            <p className="c-numbers-n">
              <CountUp value={8000} suffix="+" />
            </p>
            <p className="c-numbers-l">Homes prepped for sale</p>
          </li>
          <li>
            <p className="c-numbers-n">$0</p>
            <p className="c-numbers-l">Paid until the home closes</p>
          </li>
          <li>
            <p className="c-numbers-n">
              {/* Derived, not typed: this said 7 while config/markets.ts
                  already carried 8, and every other market surface on the
                  site reads from that list. */}
              <CountUp value={MARKETS.length} /> markets
            </p>
            <p className="c-numbers-l">Each with its own manager</p>
          </li>
          <li>
            <p className="c-numbers-n">
              <CountUp value={1} />
              -year
            </p>
            <p className="c-numbers-l">Warranty on completed work</p>
          </li>
        </ul>
      </Section>

      {/* Pay at closing lives HERE — the nav item is gone, the message is not.
          The header's announce bar links to this anchor. */}
      <div id="pay-at-closing" className="c-onwhite">
        <QualifyCard />
      </div>

      <CtaCloser
        title={
          <>
            See it on your
            <br />
            next listing.
          </>
        }
      />

      <StickyCta href="/contact" label="Get a free estimate" />
    </>
  );
}
