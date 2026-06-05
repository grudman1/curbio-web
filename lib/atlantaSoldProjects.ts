// ─────────────────────────────────────────────────────────────────────────────
// Atlanta sold-proof data. Specific named listings beat generic claims.
// Photos are striped placeholders until real Curbio project photos land
// (see /public/sold/). Edit per market.
// ─────────────────────────────────────────────────────────────────────────────

export type SoldProject = {
  neighborhood: string; // "Intown Atlanta"
  state: string; // "GA"
  price: string; // "$665,000"
  photo: string; // /sold/*.jpg — striped placeholder until real photo
  /** When true, price is a Zestimate, not a confirmed sale. Render quietly or omit. */
  unverified?: boolean;
};

export const ATLANTA_SOLD: SoldProject[] = [
  { neighborhood: "Intown Atlanta", state: "GA", price: "$665,000", photo: "/sold/atlanta.jpg" },
  { neighborhood: "Marietta", state: "GA", price: "$365,000", photo: "/sold/marietta.jpg" },
  { neighborhood: "Roswell", state: "GA", price: "$785,000", photo: "/sold/roswell.jpg" },
  // TODO verify — Zestimate, not a confirmed sale. Replace or remove before a real send.
  { neighborhood: "Acworth", state: "GA", price: "$497,000", photo: "/sold/acworth.jpg", unverified: true },
  { neighborhood: "Lawrenceville", state: "GA", price: "$354,000", photo: "/sold/lawrenceville.jpg" },
];

export const ATLANTA_SOLD_CAPTION = "Real Atlanta listings, market-ready. All sold.";
