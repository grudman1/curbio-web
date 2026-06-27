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
};

export const EXP_PARTNER: Partner = {
  id: "exp",
  name: "eXp Realty",
  logoPath: "/partners/exp-solutions-white.svg",
  badgePath: "/partners/exp-badge-trusted-white.png",
  badgePathDark: "/partners/exp-badge-trusted-black.png",
  referralSourceId: "eXp realty",
};
