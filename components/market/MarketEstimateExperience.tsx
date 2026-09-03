import Image from "next/image";
import { FormCard } from "@/components/FormCard";
import { HowItWorks } from "@/components/LpSections";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { CtaVariant } from "@/lib/ctaVariant";
import type { ResolvedMarket } from "@/lib/markets";
import type { PublishableMarketContent } from "./marketContent";

export type MarketLocationPrefill = {
  input: string;
  zip?: string;
  address?: string;
};

const WHY = [
  {
    title: "One accountable local team",
    body: "Your Curbio manager owns the plan, schedule, trades, materials, and final walkthrough.",
  },
  {
    title: "Built for listing timelines",
    body: "A single scope keeps cosmetic updates, repairs, staging, and photography moving together.",
  },
  {
    title: "Pay at closing",
    body: "Qualified sellers can preserve cash before the sale and pay from proceeds at closing.",
  },
];

const SERVICES = [
  "Interior and exterior painting",
  "Flooring and refinishing",
  "Kitchen and bath updates",
  "Inspection repairs",
  "Curb appeal and landscaping",
  "Cleaning, haul-away, and staging",
];

const EVERGREEN_POSTS = [
  {
    title: "9 Small (But Mighty) Home Updates Agents Recommend",
    href: "https://curbio.com/curb-appeal-blog/9-small-but-mighty-home-updates-agents-recommend-before-listing/",
    image: "/home/results/interior-exterior-painting.jpg",
  },
  {
    title: "7 Curb Appeal Ideas and Tips",
    href: "https://curbio.com/curb-appeal-blog/6-ideas-improve-house-curb-appeal/",
    image: "/home/results/curb-appeal-landscaping.jpg",
  },
];

export function MarketEstimateExperience({
  market,
  resolvedMarket,
  crmMarketName,
  location,
  content,
  variant,
  ctaCopy,
  source,
}: {
  market: CampaignMarket;
  resolvedMarket: ResolvedMarket;
  crmMarketName?: string | null;
  location: MarketLocationPrefill | null;
  content: PublishableMarketContent | null;
  variant: CtaVariant;
  ctaCopy: string;
  source: string;
}) {
  const locationLabel = location?.input || resolvedMarket.displayName;
  const phone = resolvedMarket.hsm.phoneRaw || "+18449442629";
  const phoneDisplay = resolvedMarket.hsm.phone || "(844) 944-2629";
  const localPosts = content ? [...content.localPosts, ...EVERGREEN_POSTS] : [];
  const hasPortraitHeadshot = resolvedMarket.hsm.photo === "/hsm/ray-santibanez.jpg";

  return (
    <>
      <section className="c-market-hero" id="estimate">
        <div className="c-container">
          <div className="c-market-hero-grid">
            <div className="c-market-intro">
              <p className="c-market-eyebrow">Curbio Concierge · {resolvedMarket.displayName}</p>
              <h1>Get your listing market-ready—without becoming the GC.</h1>
              <p>
                Your local Curbio team manages repairs, updates, and staging from walkthrough to
                market. Qualified sellers can pay at closing.
              </p>
            </div>
            <div className="c-market-form">
              <FormCard
                market={market}
                crmMarketName={crmMarketName}
                variant={variant}
                ctaCopy={ctaCopy}
                source={source}
                prefillZip={location?.zip}
                prefillAddress={location?.address}
                locationLabel={locationLabel}
                consumeMarketPrefill={Boolean(location)}
              />
            </div>
            <aside className="c-market-hsm" aria-label={`Your ${resolvedMarket.name} Curbio manager`}>
              <div className={`c-market-hsm-photo${hasPortraitHeadshot ? " c-market-hsm-photo--portrait" : ""}`}>
                {resolvedMarket.hsm.photo ? (
                  <Image
                    src={resolvedMarket.hsm.photo}
                    alt={`${resolvedMarket.hsm.name}, ${resolvedMarket.hsm.title}`}
                    fill
                    sizes="(max-width: 860px) 100vw, 430px"
                    style={{
                      objectFit: hasPortraitHeadshot ? "contain" : "cover",
                      objectPosition: "center top",
                    }}
                  />
                ) : (
                  <div className="c-market-hsm-placeholder" aria-hidden />
                )}
              </div>
              <div className="c-market-hsm-body">
                <p className="c-market-hsm-kicker">Your local Curbio manager</p>
                <h2>{resolvedMarket.hsm.name}</h2>
                <p>{resolvedMarket.hsm.bio}</p>
                <div className="c-market-availability">
                  <span className={resolvedMarket.isBusinessHours ? "is-open" : ""} aria-hidden />
                  {resolvedMarket.isBusinessHours ? "Available now" : "Available during business hours"}
                </div>
                <a className="c-market-call" href={`tel:${phone}`}>
                  <span>{resolvedMarket.isBusinessHours ? `Call ${resolvedMarket.hsm.firstName} now` : `Call ${resolvedMarket.hsm.firstName}`}</span>
                  <strong>{phoneDisplay}</strong>
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {content && (
        <section className="c-market-trust" aria-label="Brokerages represented by local Curbio clients">
          <div className="c-container c-market-trust-inner">
            <p>Trusted by agents from leading brokerages</p>
            <div className="c-market-logos">
              {content.brokerageMarks.map((brokerage) => (
                <div className="c-market-logo" key={brokerage.name}>
                  {brokerage.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brokerage.src} alt={brokerage.name} />
                  ) : (
                    <span>{brokerage.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="c-market-section">
        <div className="c-container">
          <p className="c-market-eyebrow">Built for the listing side</p>
          <h2 className="c-market-h2">Why agents count on Curbio</h2>
          <div className="c-market-three">
            {WHY.map((item, index) => (
              <article key={item.title}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="c-market-section c-market-services">
        <div className="c-container c-market-services-grid">
          <div>
            <p className="c-market-eyebrow">Every listing needs something</p>
            <h2 className="c-market-h2">One team to get it all market-ready</h2>
            <ul>
              {SERVICES.map((service) => <li key={service}>{service}</li>)}
            </ul>
          </div>
          <figure className="c-market-before-after">
            <div>
              <Image src="/home/deal/6906-deer-run-before.jpg" alt="Living space before Curbio updates" fill sizes="(max-width: 860px) 50vw, 320px" />
              <span>Before</span>
            </div>
            <div>
              <Image src="/home/deal/6906-deer-run-after.jpg" alt="Living space after Curbio updates" fill sizes="(max-width: 860px) 50vw, 320px" />
              <span>After</span>
            </div>
          </figure>
        </div>
      </section>

      <div className="c-market-how">
        <div className="c-container c-market-how-heading">
          <p className="c-market-eyebrow">From walkthrough to close</p>
          <h2 className="c-market-h2">How Curbio works</h2>
        </div>
        <HowItWorks onWhite />
      </div>

      {content && (
        <>
          <section className="c-market-section c-market-projects">
            <div className="c-container">
              <p className="c-market-eyebrow">Local proof</p>
              <h2 className="c-market-h2">Recently completed in {resolvedMarket.name}</h2>
              <div className="c-market-project-grid">
                {content.projects.map((project) => (
                  <article key={project.neighborhood}>
                    <div><Image src={project.photo} alt={`${project.neighborhood} listing prepared by Curbio`} fill sizes="(max-width: 700px) 100vw, 33vw" /></div>
                    <p>{project.neighborhood}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="c-market-section c-market-testimonials">
            <div className="c-container">
              <p className="c-market-eyebrow">What local agents say</p>
              {content.testimonials.map((testimonial) => (
                <figure key={testimonial.name}>
                  <blockquote>“{testimonial.quote}”</blockquote>
                  <figcaption>{testimonial.name} · {testimonial.brokerage}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section className="c-market-section c-market-faq">
            <div className="c-container">
              <p className="c-market-eyebrow">Local answers</p>
              <h2 className="c-market-h2">Frequently asked questions</h2>
              <details open>
                <summary>What is Curbio’s service area in {resolvedMarket.name}?</summary>
                <p>{content.serviceAreaAnswer}</p>
              </details>
              <details>
                <summary>What kinds of listing prep can Curbio manage?</summary>
                <p>Projects can range from paint, flooring, cleaning, and inspection repairs to kitchen, bath, curb-appeal, and staging work.</p>
              </details>
              <details>
                <summary>Who manages the work?</summary>
                <p>Your local Curbio manager coordinates the scope, trades, materials, schedule, quality checks, and updates in one place.</p>
              </details>
              <details>
                <summary>When does the seller pay?</summary>
                <p>Qualified sellers may defer payment until closing. Eligibility and final terms are confirmed before work begins.</p>
              </details>
            </div>
          </section>

          <section className="c-market-section c-market-posts">
            <div className="c-container">
              <p className="c-market-eyebrow">For your next listing</p>
              <h2 className="c-market-h2">Local insight and practical prep advice</h2>
              <div className="c-market-post-grid">
                {localPosts.map((post) => (
                  <a href={post.href} key={post.href}>
                    <div><Image src={post.image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" /></div>
                    <h3>{post.title}</h3>
                    <span>Read article →</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="c-market-closer" data-dark="true">
        <div className="c-container">
          <p>One local team. One accountable plan.</p>
          <h2>Bring us the listing. We’ll manage the prep.</h2>
          <a href="#quote-form">Get my free estimate</a>
        </div>
      </section>
    </>
  );
}
