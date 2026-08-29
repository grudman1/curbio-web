// Curbio Landing Page — market + Home Sale Manager (HSM) data, lead magnets.
// Plain script, exported to window. No JSX here.

// Each market maps to a local Curbio Home Sale Manager (HSM).
// In production this is resolved from geo / email domain / ZIP lookup.
window.CURBIO_MARKETS = [
  {
    id: 'dc',
    market: 'Washington, DC Metro',
    region: 'DC · MD · Northern VA',
    zips: ['20', '21', '22'],
    hsm: {
      name: 'Lisa Tucker',
      title: 'Home Sale Manager',
      years: '9 yrs in pre-listing renovation',
      projects: '600+ homes prepped',
      bio: "Lisa has helped DC-area agents and sellers get hundreds of listings market-ready on time and on budget. She scopes the work, builds the plan, and stays accountable from first walkthrough to closing.",
      phone: '(202) 555-0148',
    },
  },
  {
    id: 'atl',
    market: 'Atlanta, GA',
    region: 'Metro Atlanta · North GA',
    zips: ['30', '31'],
    hsm: {
      name: 'Priya Nair',
      title: 'Home Sale Manager',
      years: '7 yrs in residential construction',
      projects: '450+ homes prepped',
      bio: "Priya partners with Atlanta agents to turn dated listings into move-in ready homes buyers compete for. One plan, one timeline, one accountable point of contact for the whole project.",
      phone: '(404) 555-0192',
    },
  },
  {
    id: 'dfw',
    market: 'Dallas–Fort Worth, TX',
    region: 'DFW Metroplex',
    zips: ['75', '76'],
    hsm: {
      name: 'Diego Ramos',
      title: 'Home Sale Manager',
      years: '11 yrs as a licensed GC',
      projects: '700+ homes prepped',
      bio: "Diego leads pre-listing projects across the Metroplex — design, materials, and full project management coordinated for you. He keeps sellers stress-free and agents looking great with their clients.",
      phone: '(214) 555-0175',
    },
  },
  {
    id: 'tpa',
    market: 'Tampa Bay, FL',
    region: 'Tampa · St. Pete · Clearwater',
    zips: ['33', '34'],
    hsm: {
      name: 'Sarah Whitfield',
      title: 'Home Sale Manager',
      years: '8 yrs in home renovation',
      projects: '500+ homes prepped',
      bio: "Sarah helps Tampa Bay sellers update before they list — without lifting a finger or paying a dime until closing. She handles the contractors so your clients can focus on the move.",
      phone: '(813) 555-0133',
    },
  },
];

// Agent testimonials — real-feel quotes shown in the testimonials grid.
// Headshots are intentionally left as branded placeholders (no fake imagery).
window.CURBIO_TESTIMONIALS = [
  {
    quote: 'Curbio made me look like a rock star real estate agent. I highly recommend using Curbio for all your renovation needs — it’s really a no-brainer!',
    name: 'Alicia Hill',
    title: 'Agent, eXp Realty',
    location: 'Austin, Texas',
  },
  {
    quote: 'I think every project is great for Curbio — it’s very rare when there isn’t anything needed to enhance value for the seller.',
    name: 'Dale Mattison',
    title: 'Agent, Long & Foster',
    location: 'Bethesda, Maryland',
  },
  {
    quote: 'Curbio is a fantastic opportunity for homes to get a quick update and appeal to buyers.',
    name: 'Heidi Wurstle',
    title: 'Agent, Baird & Warner',
    location: 'Chicago, Illinois',
  },
  {
    quote: 'You sit down with Curbio, you tell them what you need, they take care of it, and you get the house on the market. I count on Curbio to deliver and get me to that closing day. It’s as easy as 1, 2, 3.',
    name: 'Peter MacDonald',
    title: 'Agent, BHHS Fox & Roach',
    location: 'Newton, Pennsylvania',
  },
  {
    quote: 'I love having Curbio oversee the work I typically have to manage. It allows me to focus on other clients because I’m not tied up in one transaction.',
    name: 'Danan Powell',
    title: 'Broker, Compass',
    location: 'Seattle, Washington',
  },
];

// Lead magnet #1 — evergreen homeowner / agent decision guide.
// Lead magnet #2 — rotates seasonally on a "turn listings into sales" theme.
window.CURBIO_MAGNETS = {
  guide1: {
    id: 'guide1',
    kicker: 'Free guide',
    title: 'The Move-In Ready Advantage',
    sub: 'Why fix-first, pay-at-closing is the easy yes for today’s sellers.',
    pages: '14-page digital guide',
    bullets: [
      'What "move-in ready" is really worth in today’s market',
      'How fix-first beats price cuts and concessions',
      'Pay-at-closing, explained — $0 out of pocket for qualified sellers',
      'Why a pre-listing concierge specialist saves the deal',
    ],
  },
  guide2: {
    id: 'guide2',
    kicker: 'Free report · Updated for Spring 2026',
    title: 'The Top 12 Things That Turn Listings Into Sales This Spring',
    sub: 'The seasonal punch-list our Home Sale Managers use to win competitive listings.',
    pages: '12-point seasonal report',
    bullets: [
      'The 12 highest-ROI updates buyers reward this spring',
      'Curb-appeal moves that drive showings and offers',
      'Where sellers waste money — and what to skip',
      'A pre-list timeline that keeps you on schedule',
    ],
    rotates: true,
  },
};
