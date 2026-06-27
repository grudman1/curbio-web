export type Partner = {
  id: string;
  name: string;
  /** Path to partner logo in /public. Swap the file to update; no code change needed. */
  logoPath: string;
  /** Path to co-brand "Trusted Provider" badge in /public. Null if unused. */
  badgePath: string | null;
  /**
   * Exact referralSourceId string for the CRM. Space and casing are load-bearing
   * (historical eXp leads carry "eXp realty" verbatim — never normalise this value).
   */
  referralSourceId: string;
};

export const EXP_PARTNER: Partner = {
  id: "exp",
  name: "eXp Realty",
  logoPath: "/partners/exp-logo.svg",
  badgePath: "/partners/exp-badge.svg",
  referralSourceId: "eXp realty",
};
