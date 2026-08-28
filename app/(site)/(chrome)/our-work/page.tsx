import type { Metadata } from "next";
import { routeMetadata } from "@/config/routes";
import { OurWork } from "@/components/home/OurWork";
import { HomeCloser } from "@/components/home/HomeCloser";

// /our-work — STUB.
//
// It exists because the homepage's gallery ends in "All projects →" and a
// homepage must not contain a dead link. What it is NOT yet is a portfolio:
// the real page is the full sold-listing index with filtering by market and
// scope, and the photography for that lives in the same public/sold/ tree
// this page already reads from.
//
// Deliberately built out of the homepage's own components rather than new
// ones — a stub that invents its own markup is a stub someone has to delete
// twice. `stub` in config/pageRegistry.ts, and only Gavin flips that to live.
//
// The header's "Our Work" nav item is STILL an inert span (see the note in
// components/site/SiteHeader.tsx). Promoting it to a real config/navigation.ts
// entry is a separate call: it would put this page in the primary nav, and a
// stub is not ready for that.

export const metadata: Metadata = {
  title: "Our Work — Curbio",
  description:
    "Real Curbio listings, by address: what the scope was, what it cost, and what the home sold for.",
  ...routeMetadata("/our-work"),
};

export default function OurWorkPage() {
  return (
    <>
      <section className="c-sect c-sect--tight-top">
        <div className="c-container" style={{ paddingTop: 120 }}>
          <p className="c-eyebrow">Our work</p>
          <h1 className="c-h2" style={{ maxWidth: "13em" }}>
            By address, not by adjective.
          </h1>
          <p className="c-lede" style={{ maxWidth: "58ch" }}>
            Every project below is a real listing a Curbio manager ran end to end &mdash;
            scoped, scheduled, and settled at closing.
          </p>
        </div>
      </section>
      <OurWork heading={false} allProjectsLink={false} />
      <HomeCloser href="/contact" />
    </>
  );
}
