import { MARKET_BY_SLUG } from "@/config/markets";

export type LocalProject = { neighborhood: string; photo: string };
export type LocalTestimonial = { quote: string; name: string; brokerage: string };
export type LocalPost = { title: string; href: string; image: string };
export type BrokerageMark = { name: string; src?: string };

export type PublishableMarketContent = {
  projects: [LocalProject, ...LocalProject[]];
  testimonials: [LocalTestimonial, ...LocalTestimonial[]];
  serviceAreaAnswer: string;
  localPosts: [LocalPost, ...LocalPost[]];
  brokerageMarks: [BrokerageMark, ...BrokerageMark[]];
};

function localProjects(slug: string, count: number): [LocalProject, ...LocalProject[]] {
  const projects = MARKET_BY_SLUG[slug]?.sold
    .filter((project): project is typeof project & { photo: string } => Boolean(project.photo))
    .slice(0, count)
    .map(({ neighborhood, photo }) => ({ neighborhood, photo })) ?? [];
  if (!projects.length) throw new Error(`Market content gate: ${slug} has no verified local projects.`);
  return projects as [LocalProject, ...LocalProject[]];
}

function publishable(slug: string, content: PublishableMarketContent): PublishableMarketContent {
  if (!content.projects.length || !content.testimonials.length || !content.serviceAreaAnswer.trim() || !content.localPosts.length) {
    throw new Error(`Market content gate: ${slug} is missing required local proof.`);
  }
  return content;
}

/**
 * This map is the publication gate. A market may still render the noindex
 * estimate flow so a served visitor is never stranded, but it cannot receive
 * indexable metadata or the local-content template until all four required
 * proof categories are present here together.
 */
export const PUBLISHABLE_MARKET_CONTENT: Partial<Record<string, PublishableMarketContent>> = {
  atlanta: publishable("atlanta", {
    projects: localProjects("atlanta", 3),
    testimonials: [
      {
        name: "Nancy Boyk",
        brokerage: "Atlanta Communities",
        quote:
          "Without Curbio, I would have been the one scheduling all the work. It was a huge help to have a partner that really takes care of it all. My favorite part was how fast they did the work. Curbio completed the job in record time.",
      },
    ],
    serviceAreaAnswer:
      "Curbio serves agents and their sellers across Metro Atlanta and North Georgia, including Atlanta, Marietta, Alpharetta, Decatur, and Sandy Springs. Enter the property ZIP above for an exact coverage check.",
    localPosts: [
      {
        title: "What Sells in Atlanta? Home Remodeling Ideas for Every Room",
        href: "https://curbio.com/curb-appeal-blog/atlanta-home-remodeling/",
        image: "/sold/atlanta/959Berne_Intown.jpeg",
      },
    ],
    brokerageMarks: [
      { name: "Atlanta Communities" },
      { name: "Ansley Real Estate", src: "/partners/brokerages/ansley.png" },
      { name: "RE/MAX", src: "/partners/brokerages/re-max.png" },
    ],
  }),
  dallas: publishable("dallas", {
    projects: localProjects("dallas", 3),
    testimonials: [
      {
        name: "David Bentinck",
        brokerage: "eXp Realty",
        quote:
          "Our project manager had our back. Curbio has systems in place to deliver fantastic service with a great turnaround time. I love working with them.",
      },
    ],
    serviceAreaAnswer:
      "Curbio serves the Dallas–Fort Worth metroplex, including Dallas, Plano, Frisco, Arlington, and Fort Worth. Enter the property ZIP above for an exact coverage check.",
    localPosts: [
      {
        title: "5 Dallas–Fort Worth Home Updates to Maximize Profit",
        href: "https://curbio.com/curb-appeal-blog/valuable-dallas-fort-worth-home-updates/",
        image: "/sold/dallas/221SEdgefield_Dallas.webp",
      },
    ],
    brokerageMarks: [
      { name: "eXp Realty", src: "/partners/exp-logo.svg" },
      { name: "Perry-Miller Streiff", src: "/partners/brokerages/perry-miller-streiff.png" },
      { name: "Coldwell Banker", src: "/partners/brokerages/coldwell-banker.png" },
    ],
  }),
  seattle: publishable("seattle", {
    projects: localProjects("seattle", 3),
    testimonials: [
      {
        name: "Christian Lalario",
        brokerage: "Coldwell Banker",
        quote:
          "Our experience with Curbio was very positive. Communication, service, and performance were excellent. Each person we came in contact with was polite and easy to work with. We will definitely use them again.",
      },
    ],
    serviceAreaAnswer:
      "Curbio serves agents throughout the Seattle metro and Puget Sound area, including Seattle, Bellevue, Kirkland, Renton, and Kent. Enter the property ZIP above for an exact coverage check.",
    localPosts: [
      {
        title: "8 Improvements to Make Before Selling in Seattle",
        href: "https://curbio.com/curb-appeal-blog/8-most-profitable-seattle-home-improvements/",
        image: "/sold/seattle/1016Ravenna_Ravenna.webp",
      },
    ],
    brokerageMarks: [
      { name: "Coldwell Banker", src: "/partners/brokerages/coldwell-banker.png" },
      { name: "Windermere" },
      { name: "RE/MAX", src: "/partners/brokerages/re-max.png" },
    ],
  }),
};

export function marketContentFor(slug: string): PublishableMarketContent | null {
  return PUBLISHABLE_MARKET_CONTENT[slug] ?? null;
}

export function marketIsPublishable(slug: string): boolean {
  return Boolean(PUBLISHABLE_MARKET_CONTENT[slug]);
}
