import { SERVICES } from "@/config/services";
import { ServicesMarquee } from "./ServicesMarquee";

// "Fast cosmetic prep" — the scrolling services list.
//
// The headline is a BOUNDARY, not a menu: what this section has to establish
// is that Curbio does not gut houses, because the objection it answers is
// "prep will blow my listing window." The eleven cards are the evidence that
// the boundary still covers everything a listing needs.
//
// The services now live in config/services.ts — one source of truth for
// this marquee and the /services index. Card photos come from the config's
// photo paths as inline background-image (the per-index .cr-t0…t9 CSS classes
// were retired with the move; same URLs, same render). The track renders
// TWICE for the seamless loop; the second copy is aria-hidden, so a screen
// reader hears the list once, not twice.
//
// LABEL ONLY on the card — one line of text over the photo. The service
// descriptions live in config/services.ts and render on /services, not here.
//
// WHAT'S STILL NOT RESTORED: the four-stat row that sat above the marquee in
// v1. Its own footnote said the numbers came from a single closed project
// (395 Meeting St) and "should be replaced with portfolio-wide numbers
// before this ships." Markup is one `git show
// 4223269^:components/home/HomeResults.tsx` away when real numbers exist.

function CardRow({ hidden }: { hidden?: boolean }) {
  return (
    <>
      {SERVICES.map((s) => (
        <div
          key={s.slug}
          className="cr-card"
          style={{ backgroundImage: `url(${s.photo})` }}
          role={hidden ? undefined : "img"}
          aria-label={hidden ? undefined : s.name}
          aria-hidden={hidden || undefined}
        >
          <p className="cr-pill">{s.name}</p>
        </div>
      ))}
    </>
  );
}

export function HomeResults() {
  return (
    <section id="results" className="c-sect">
      <div className="c-container">
        <p className="c-eyebrow">Fast, focused, proven</p>
        <h2 className="c-h2" style={{ maxWidth: "16em" }}>
          Fast cosmetic prep. No flips, no gut jobs, no blown listing windows.
        </h2>
        <p className="c-lede" style={{ maxWidth: "60ch" }}>
          Just the fast, high-ROI updates that data shows actually sell homes &mdash; done in
          weeks, not months.
        </p>
      </div>
      <ServicesMarquee>
        <CardRow />
        <CardRow hidden />
      </ServicesMarquee>
      <div className="c-container">
        <a className="cr-cta" href="/services">
          See all services <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </section>
  );
}
