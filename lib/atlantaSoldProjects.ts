// ─────────────────────────────────────────────────────────────────────────────
// Atlanta "Sold Proof" data — easy to edit per market.
// Replace photo paths once Curbio OWN project photos are available.
// All prices are verified sold prices — NOT Zestimates.
// ─────────────────────────────────────────────────────────────────────────────

export type SoldProject = {
  neighborhood: string;
  price: string;
  soldNote: string;
  photo: string;
  /** Optional before-state photo. When present the featured tile renders
   *  the BEFORE / AFTER toggle per the design brief's signature device. */
  before?: string;
};

export type FilmstripItem = {
  /** Short label shown under the thumbnail, e.g. "$365K · Marietta" */
  label: string;
  photo: string;
  before?: string;
  /** Full caption fields shown when this item is in the featured slot.
   *  Defaults to parsing `label` if omitted. */
  neighborhood?: string;
  price?: string;
  soldNote?: string;
};

export type SoldProofData = {
  eyebrow: string;
  featured: SoldProject;
  filmstrip: FilmstripItem[];
  closingLine: string;
};

export const ATLANTA_SOLD: SoldProofData = {
  eyebrow: "Sold across Atlanta",
  featured: {
    neighborhood: "Intown Atlanta, GA",
    price: "$665,000",
    soldNote: "Prepped by Curbio · sold Oct 2025",
    photo: "/sold/atlanta-berne-st.jpg",
    // before: "/sold/atlanta-berne-st-before.jpg",  ← uncomment when available
  },
  filmstrip: [
    {
      label: "$365K · Marietta",
      photo: "/sold/marietta.jpg",
      neighborhood: "Marietta, GA",
      price: "$365,000",
      soldNote: "Prepped by Curbio · sold",
    },
    {
      label: "$785K · Roswell",
      photo: "/sold/roswell.jpg",
      neighborhood: "Roswell, GA",
      price: "$785,000",
      soldNote: "Prepped by Curbio · sold",
    },
    {
      label: "$497K · Acworth",
      photo: "/sold/acworth.jpg",
      neighborhood: "Acworth, GA",
      price: "$497,000", // verified sold price, not a Zestimate
      soldNote: "Prepped by Curbio · sold",
    },
    {
      label: "$354K · L'ville",
      photo: "/sold/lawrenceville.jpg",
      neighborhood: "Lawrenceville, GA",
      price: "$354,000",
      soldNote: "Prepped by Curbio · sold",
    },
  ],
  closingLine: "Real Atlanta listings, prepped by Curbio. All sold.",
};
