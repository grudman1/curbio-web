import Image from "next/image";
import { publicGiveaway, type Giveaway } from "@/config/giveaways";
import { RichText } from "@/components/campaign/RichText";
import { isClosed } from "@/lib/giveaway/mode";
import { nationalSoldMix } from "@/lib/giveaway/soldMix";
import { PARTNERS } from "@/lib/partners";
import { GiveawayHero } from "./GiveawayHero";
import { CloserSection, HeaderCta, PrizeSection } from "./GiveawayParts";
import { GiveawayShell } from "./GiveawayShell";
import { GiveawayIcon } from "./icons";
import "./giveaway.css";

// ─────────────────────────────────────────────────────────────────────────────
// THE GIVEAWAY PAGE — an event-themed sibling of the eXp partner page.
//
// A SIBLING of the campaign template, not an instance of it. CampaignShell is
// "the" template and says there must never be a per-page shell — because a
// second shell is how the shared spine (form, attribution, confirm handoff)
// drifts. This page does not fork that spine; it has a different one, by
// necessity (see config/giveaways/types.ts), and reuses everything underneath:
//
//   tokens and type        the design's colours are our palette hex for hex,
//                          so nothing here names a colour
//   the eXp co-brand       logos and the Trusted Provider badge from
//                          lib/partners.ts, the same assets /exp shows
//   how-it-works copy      the three steps are /exp's, word for word
//   sold homes             config/markets.ts, through lib/giveaway/soldMix.ts
//
// Server-rendered and static. The parts that change when the drawing closes
// are client components under GiveawayShell; everything else is HTML.
// ─────────────────────────────────────────────────────────────────────────────

// The same three steps LpSections.HowItWorks renders on /exp. Repeated here
// because that list is private to its component, and exporting it would be an
// edit to a file /exp is built from. If the steps change there, change them
// here.
const STEPS = [
  {
    title: "We walk the property.",
    body: "A local Curbio manager builds a full prep plan — what to fix, what to skip, and what moves the needle.",
  },
  { title: "We do the work.", body: "Paint, repairs, staging. One team, one timeline." },
  {
    title: "Seller pays at close.",
    body: "Nothing due upfront. Qualified sellers pay from proceeds when the home sells.",
  },
];

const SHELL = "mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-10";
const EYEBROW = "m-0 font-sans text-label font-black uppercase text-state-info";
const RULE = "block h-[3px] w-14 rounded-[2px] bg-accent";

export function GiveawayPage({ giveaway }: { giveaway: Giveaway }) {
  const { copy } = giveaway;
  const exp = PARTNERS.exp;
  const homes = nationalSoldMix();

  return (
    <GiveawayShell giveaway={publicGiveaway(giveaway)} initialClosed={isClosed(giveaway)}>
      <div className="bg-surface font-sans text-content">
        <p className="m-0 flex items-center justify-center gap-2.5 bg-surface-sunken px-5 py-2.5 text-center font-sans text-[13px] font-semibold leading-[1.4] text-content">
          <span className="h-2 w-2 flex-none rounded-full bg-accent" aria-hidden />
          <span className="sm:hidden">{copy.banner.short}</span>
          <span className="hidden sm:inline">{copy.banner.full}</span>
        </p>

        <header className="sticky top-0 z-header bg-surface-inverse">
          <div className={`${SHELL} flex items-center justify-between gap-4 py-2.5 sm:py-3.5`}>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3.5">
              <Image
                src="/logo/curbio-white.svg"
                alt="Curbio"
                width={500}
                height={130}
                priority
                unoptimized
                className="block h-5 w-auto flex-none sm:h-7"
              />
              <span className="h-6 w-px flex-none bg-white/40" aria-hidden />
              <Image
                src={exp.logoPath}
                alt={exp.coBrand.logoAlt}
                width={470}
                height={95}
                unoptimized
                className="block h-[18px] w-auto min-w-0 sm:h-[26px]"
              />
            </div>
            <HeaderCta />
          </div>
        </header>

        <main>
          <GiveawayHero />
          <PrizeSection />

          <section className="bg-surface-accent py-14 lg:py-[104px]">
            <div className={`${SHELL} flex flex-col gap-7 lg:gap-12`}>
              <div className="flex max-w-[760px] flex-col gap-3.5">
                <p className={EYEBROW}>{copy.why.eyebrow}</p>
                <h2 className="text-[clamp(32px,4.4vw,52px)] leading-[1.1]">
                  <RichText>{copy.why.headline}</RichText>
                </h2>
                <span className={RULE} aria-hidden />
              </div>

              <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-3 lg:gap-5">
                {STEPS.map((step, i) => (
                  <li
                    key={step.title}
                    className="flex flex-col gap-3 rounded-xl bg-surface-raised p-7 shadow-[0_4px_14px_rgba(13,37,77,0.06)]"
                  >
                    <span className="font-serif text-[44px] font-semibold leading-none text-accent" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-[22px] leading-[1.25]">{step.title}</h3>
                    <p className="m-0 font-sans text-[15px] leading-[1.55] text-content-muted">{step.body}</p>
                  </li>
                ))}
              </ol>

              <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
                <Proof icon="house">8,000+ homes prepped</Proof>
                <Proof icon="award">1-year warranty</Proof>
                <Proof icon="shield">Licensed &amp; insured</Proof>
                <li className="flex items-center gap-3 rounded-full bg-surface py-2.5 pl-2.5 pr-[18px]">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-surface-raised">
                    {exp.badgePathDark && (
                      <Image src={exp.badgePathDark} alt="" width={68} height={68} className="h-[34px] w-[34px]" />
                    )}
                  </span>
                  <span className="font-sans text-small font-bold text-content">Trusted eXp Solution Provider</span>
                </li>
              </ul>
            </div>
          </section>

          {homes.length > 0 && (
            <section className="bg-surface py-14 lg:py-[104px]">
              <div className={`${SHELL} flex flex-col gap-7`}>
                <div className="flex flex-col gap-3.5">
                  <p className={EYEBROW}>{copy.sold.eyebrow}</p>
                  <h2 className="text-[clamp(30px,3.6vw,44px)] leading-[1.12]">
                    <RichText>{copy.sold.headline}</RichText>
                  </h2>
                </div>
                {/* A swipeable row on a phone, a plain grid from tablet up. The
                    scroll padding matches the row's own padding: without it,
                    snapping pulls the first card flush to the screen edge. */}
                <ul className="gw-strip -mx-5 my-0 grid list-none auto-cols-[minmax(220px,78%)] grid-flow-col gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible sm:p-0 lg:grid-cols-4">
                  {homes.map((home) => (
                    <li
                      key={home.marketSlug}
                      className="flex flex-col gap-3 rounded-lg bg-surface-raised p-2.5 shadow-[0_4px_14px_rgba(13,37,77,0.08)]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface-sunken">
                        <Image
                          src={home.photo}
                          alt={`${home.neighborhood} home prepped by Curbio`}
                          fill
                          sizes="(max-width: 640px) 70vw, 260px"
                          className="object-cover"
                        />
                        <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-accent px-2.5 py-[5px] font-sans text-micro font-black uppercase tracking-[0.14em] text-content">
                          Sold
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 px-1.5 pb-1.5">
                        <div className="min-w-0">
                          <div className="truncate font-sans text-[15px] font-bold text-content">{home.neighborhood}</div>
                          <div className="font-sans text-[13px] text-content-muted">{home.market}</div>
                        </div>
                        <div className="font-serif text-[17px] font-semibold text-content">{home.price}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <CloserSection />
        </main>

        <footer className="border-t border-white/[0.18] bg-surface-inverse">
          <div className={`${SHELL} flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-[22px]`}>
            <Image
              src="/logo/curbio-white.svg"
              alt="Curbio"
              width={500}
              height={130}
              unoptimized
              className="block h-6 w-auto"
            />
            <p className="m-0 font-sans text-[13px] text-content-inverse">The pre-listing home improvement experts.</p>
          </div>
        </footer>
      </div>
    </GiveawayShell>
  );
}

function Proof({ icon, children }: { icon: "house" | "award" | "shield"; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-full bg-surface py-2.5 pl-2.5 pr-[18px]">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-surface-raised text-content">
        <GiveawayIcon name={icon} size={20} />
      </span>
      <span className="font-sans text-small font-bold text-content">{children}</span>
    </li>
  );
}
