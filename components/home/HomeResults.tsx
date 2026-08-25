import { SERVICES } from "@/config/services";
import { ServicesMarquee } from "./ServicesMarquee";

// "Results worth funding" — the scrolling services list. Cut in v2, restored
// in #37, and given its real ten services + photography on Aug 7 (Gavin).
//
// The ten services now live in config/services.ts — one source of truth for
// this marquee and the /services index. Card photos come from the config's
// photo paths as inline background-image (the per-index .cr-t0…t9 CSS classes
// were retired with the move; same URLs, same render). The track renders
// TWICE for the seamless loop; the second copy is aria-hidden, so a screen
// reader hears the ten services once, not twenty.
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
        <p className="c-eyebrow">Results worth funding</p>
        <h2 className="c-h2" style={{ maxWidth: "15em" }}>
          From a bathroom remodel to staging, we do all the work that moves the
          price.
        </h2>
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
