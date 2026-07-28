export type Partner = {
  id: string;
  name: string;
  /** Path to partner logo in /public. Swap the file to update; no code change needed. */
  logoPath: string;
  /** Trusted Provider badge for dark/navy backgrounds (white ink). */
  badgePath: string | null;
  /** Trusted Provider badge for light/white backgrounds (black ink). */
  badgePathDark: string | null;
  /**
   * Exact referralSourceId string for the CRM. Space and casing are load-bearing
   * (historical eXp leads carry "eXp realty" verbatim — never normalise this value).
   */
  referralSourceId: string;
  /**
   * Co-brand lockup copy. Data, not markup — ~50 partner pages are coming and
   * each needs its own wording. `{market}` interpolates the market name.
   * `neutral` is used before the visitor's market is known.
   */
  coBrand: {
    servingLine: { default: string; neutral: string };
    /** Two-line title beside the badge. `\n` breaks the line. */
    title: string;
    badgeAlt: string;
    logoAlt: string;
  };
};

export const EXP_PARTNER: Partner = {
  id: "exp",
  name: "eXp Realty",
  logoPath: "/partners/exp-solutions-white.svg",
  badgePath: "/partners/exp-badge-trusted-white.png",
  badgePathDark: "/partners/exp-badge-trusted-black.png",
  referralSourceId: "eXp realty",
  coBrand: {
    servingLine: { default: "Serving {market} eXp Realty", neutral: "For eXp Realty agents" },
    title: "A Trusted Provider for\neXp Realty agents",
    badgeAlt: "eXp Solutions Trusted Provider",
    logoAlt: "eXp Solutions",
  },
};

/** Partner registry, by id. Referenced from a campaign config's `partner`. */
export const PARTNERS: Record<string, Partner> = {
  [EXP_PARTNER.id]: EXP_PARTNER,
};
