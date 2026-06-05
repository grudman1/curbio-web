"use client";

import { useEffect, useRef, useState } from "react";
import { type ResolvedMarket } from "@/lib/markets";
import { Icon, Eyebrow, AmberRule, PillButton, PhotoPlaceholder, Field } from "./LpKit";

const LOGO = "/logo/curbio-white.svg";

// Agent testimonials — verbatim from the Claude Design handoff (data.js).
const TESTIMONIALS = [
  {
    quote:
      "Curbio made me look like a rock star real estate agent. I highly recommend using Curbio for all your renovation needs — it’s really a no-brainer!",
    name: "Alicia Hill",
    title: "Agent, eXp Realty",
    location: "Austin, Texas",
  },
  {
    quote:
      "I think every project is great for Curbio — it’s very rare when there isn’t anything needed to enhance value for the seller.",
    name: "Dale Mattison",
    title: "Agent, Long & Foster",
    location: "Bethesda, Maryland",
  },
  {
    quote: "Curbio is a fantastic opportunity for homes to get a quick update and appeal to buyers.",
    name: "Heidi Wurstle",
    title: "Agent, Baird & Warner",
    location: "Chicago, Illinois",
  },
  {
    quote:
      "You sit down with Curbio, you tell them what you need, they take care of it, and you get the house on the market. I count on Curbio to deliver and get me to that closing day. It’s as easy as 1, 2, 3.",
    name: "Peter MacDonald",
    title: "Agent, BHHS Fox & Roach",
    location: "Newton, Pennsylvania",
  },
  {
    quote:
      "I love having Curbio oversee the work I typically have to manage. It allows me to focus on other clients because I’m not tied up in one transaction.",
    name: "Danan Powell",
    title: "Broker, Compass",
    location: "Seattle, Washington",
  },
];

// ── Nav ──
export function Nav({ onQuote }: { onQuote: () => void }) {
  return (
    <header className="lp-nav">
      <div className="lp-shell lp-nav-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO} alt="Curbio" className="lp-logo" />
        <div className="lp-nav-right">
          <PillButton size="sm" variant="ghostNavy" href="#downloads">
            Learn more
          </PillButton>
          <PillButton size="sm" onClick={onQuote}>
            Get a free quote
          </PillButton>
        </div>
      </div>
    </header>
  );
}

// ── Geo market bar (sage, reveals below the nav once a market is resolved) ──
export function MarketBar({
  market,
  source,
  onZip,
}: {
  market: ResolvedMarket | null;
  source: "param" | "zip" | "geo" | "none";
  onZip: () => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!market) return;
    const t = setTimeout(() => setShown(true), 550);
    return () => clearTimeout(t);
  }, [market]);

  // Only surface the bar when we actually have a local team to name.
  if (!market) return null;

  return (
    <div className={"lp-geobar" + (shown ? " show" : "")} aria-hidden={!shown}>
      <div className="lp-shell lp-geobar-inner">
        <span className="lp-geobar-txt">
          <Icon name="pin" size={14} color="var(--teal-110)" />
          {source === "geo" ? (
            <span>
              Located you in <strong>{market.displayName}</strong> — you’re matched with {market.hsm.firstName}, a
              local Home Services Manager.
            </span>
          ) : (
            <span>
              Showing your local team in <strong>{market.displayName}</strong> — matched with {market.hsm.firstName}.
            </span>
          )}
        </span>
        <button className="lp-geobar-link" onClick={onZip}>
          Not your market? Click here.
        </button>
      </div>
    </div>
  );
}

// ── Hero ──
export function Hero({
  market,
  onQuote,
  onZip,
}: {
  market: ResolvedMarket | null;
  onQuote: () => void;
  onZip: () => void;
}) {
  return (
    <section className="lp-hero">
      <div className="lp-shell lp-hero-grid">
        <div>
          <Eyebrow amber style={{ marginBottom: 18 }}>
            Pre-listing home improvement
          </Eyebrow>
          <h1 className="lp-hero-h1">
            A market-ready listing.
            <br />
            <em>Paid for at close.</em>
          </h1>
          <AmberRule width={64} style={{ margin: "18px 0" }} />
          <p className="lp-hero-sub">
            Curbio gets your listing market-ready on time and on budget — design, materials, and full project
            management, handled by one local expert. Your seller pays nothing until the home sells.
          </p>
          <div className="lp-hero-cta">
            <PillButton size="lg" onClick={onQuote}>
              Get a free quote
            </PillButton>
            {market ? (
              <PillButton size="lg" variant="secondary" icon="calendar" href={market.hsm.calendlyUrl} target="_blank">
                Speak with {market.hsm.firstName}
              </PillButton>
            ) : (
              <PillButton size="lg" variant="secondary" icon="pin" onClick={onZip}>
                Find your market
              </PillButton>
            )}
            <a className="lp-hero-learn" href="#downloads">
              Learn more <Icon name="arrow" size={15} color="currentColor" />
            </a>
          </div>
          <div className="lp-trust">
            <Icon name="shield" size={15} color="var(--amber)" />
            <span>Licensed &amp; insured · 8,000+ homes prepped · Pay at close</span>
          </div>
        </div>

        {market ? <HsmCard market={market} /> : <NeutralCard onChoose={onZip} />}
      </div>
    </section>
  );
}

function HsmCard({ market }: { market: ResolvedMarket }) {
  const { hsm } = market;
  return (
    <aside className="lp-hsm">
      <div className="lp-hsm-photo">
        {hsm.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hsm.photo}
            alt={`${hsm.name}, ${hsm.title}`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
        ) : (
          <PhotoPlaceholder
            label={`Drop ${hsm.firstName}’s headshot`}
            tone="warm"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 0 }}
          />
        )}
        <span className="lp-hsm-badge">
          <Icon name="pin" size={13} color="#fff" /> {market.displayName}
        </span>
      </div>
      <div className="lp-hsm-body">
        <div className="lp-hsm-name">{hsm.name}</div>
        <div className="lp-hsm-title">{hsm.title}</div>
        <p className="lp-hsm-bio">{hsm.bio}</p>
        <div className="lp-hsm-stats">
          <span>
            <Icon name="home" size={15} color="var(--amber)" />
            <span>Local to {market.name}</span>
          </span>
          <span>
            <span className="lp-dot-wrap" aria-hidden>
              <span className={"lp-dot" + (market.isBusinessHours ? " on" : "")} />
            </span>
            <span>{market.isBusinessHours ? "Available now" : "Replies next day"}</span>
          </span>
        </div>
        {hsm.phone ? (
          <a className="lp-hsm-callbox" href={`tel:${hsm.phoneRaw}`}>
            <span className="lp-hsm-callicon">
              <Icon name="phone" size={18} color="var(--amber)" />
            </span>
            <span className="lp-hsm-callinfo">
              <span className="lp-hsm-calllabel">Call {hsm.firstName} directly</span>
              <span className="lp-hsm-callnum">{hsm.phone}</span>
            </span>
          </a>
        ) : null}
      </div>
    </aside>
  );
}

function NeutralCard({ onChoose }: { onChoose: () => void }) {
  return (
    <aside className="lp-hsm">
      <div
        className="lp-hsm-photo lp-ph lp-ph-warm"
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Icon name="pin" size={40} color="rgba(13,37,77,0.32)" />
        <span className="lp-hsm-badge">
          <Icon name="pin" size={13} color="#fff" /> Find your team
        </span>
      </div>
      <div className="lp-hsm-body">
        <div className="lp-hsm-name">Find your local expert</div>
        <div className="lp-hsm-title">Home Services Manager · By market</div>
        <p className="lp-hsm-bio">
          Choose your market and we&apos;ll match you with the Curbio Home Services Manager who handles your
          area — or enter your ZIP.
        </p>
        <div style={{ marginTop: 18 }}>
          <PillButton full size="lg" icon="arrow" onClick={onChoose}>
            Choose your market
          </PillButton>
        </div>
      </div>
    </aside>
  );
}

// ── Social proof: testimonial carousel + stats band ──
// ── Testimonials carousel (navy band) ──
export function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".lp-tcard");
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "24") || 24;
    const step = card ? card.offsetWidth + gap : track.clientWidth;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section className="lp-testis" id="social">
      <div className="lp-shell">
        <div className="lp-testis-head">
          <Eyebrow amber>Loved by agents</Eyebrow>
          <h2 className="lp-h2">
            Agents nationwide <em>count on Curbio.</em>
          </h2>
        </div>
        <div className="lp-carousel">
          <button className="lp-carousel-arrow prev" onClick={() => scroll(-1)} aria-label="Previous testimonials">
            <Icon name="arrow" size={20} color="currentColor" style={{ transform: "rotate(180deg)" }} />
          </button>
          <div className="lp-carousel-track" ref={trackRef}>
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} className="lp-tcard">
                <span className="lp-tcard-mark">&ldquo;</span>
                <blockquote className="lp-tcard-quote">{t.quote}</blockquote>
                <figcaption className="lp-tcard-foot">
                  <div className="lp-tcard-name">{t.name}</div>
                  <div className="lp-tcard-title">{t.title}</div>
                  <div className="lp-tcard-loc">{t.location}</div>
                </figcaption>
              </figure>
            ))}
          </div>
          <button className="lp-carousel-arrow next" onClick={() => scroll(1)} aria-label="Next testimonials">
            <Icon name="arrow" size={20} color="currentColor" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Stats band (with numbered source references) ──
export function Stats() {
  const stats = [
    { n: "$400", ref: 1, l: "The potential return on every $100 you invest in staging your home" },
    { n: "8,000+", ref: 2, l: "Homes prepped" },
    { n: "$0", ref: 3, l: "Until the home sells" },
  ];
  return (
    <section className="lp-stats" id="stats">
      <div className="lp-shell">
        <div className="lp-statrow">
          {stats.map((s, i) => (
            <div key={i} className="lp-statcell">
              <div className="lp-statcell-n">{s.n}</div>
              <div className="lp-statcell-l">
                {s.l}
                <sup className="lp-statref">{s.ref}</sup>
              </div>
            </div>
          ))}
        </div>
        <p className="lp-statsrc">
          <sup>1</sup> National Association of Realtors. <sup>2</sup> Curbio internal data.{" "}
          <sup>3</sup> Pay-at-close financing available to qualified sellers, subject to approval.
        </p>
      </div>
    </section>
  );
}

// ── Downloads: soft opt-in inline capture (agent resource kit) ──
export function Downloads({ market }: { market: ResolvedMarket | null }) {
  const [f, setF] = useState({ name: "", email: "" });
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          email: f.email.trim(),
          zip: "00000",
          market: market?.slug ?? null,
          source: "magnet",
          magnet: "resource-kit",
          submittedAt: new Date().toISOString(),
        }),
      }).catch(() => {});
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="lp-dl" id="downloads">
      <div className="lp-shell">
        <div className="lp-dl-inner">
          <div>
            <Eyebrow amber>Not ready for a quote?</Eyebrow>
            <h2 className="lp-dl-h">Get the agent resource kit.</h2>
            <p className="lp-dl-sub">
              The materials our top agents bring to every listing appointment — so you can present a full-service,
              pay-at-close solution from day one. Sent straight to your inbox, no strings attached.
            </p>
            <ul className="lp-dl-list">
              <li>
                <Icon name="doc" size={18} color="var(--amber)" /> Listing presentation
              </li>
              <li>
                <Icon name="clipboard" size={18} color="var(--amber)" /> Pre-sale home improvement checklist
              </li>
            </ul>
          </div>
          <div className="lp-dl-card">
            {!sent ? (
              <form className="lp-dl-form" onSubmit={submit}>
                <Field label="Full name" value={f.name} onChange={set("name")} required />
                <Field label="Work email" type="email" value={f.email} onChange={set("email")} required />
                <PillButton full size="lg" type="submit" disabled={!valid || pending} icon="arrow">
                  {pending ? "Sending…" : "Email me the kit"}
                </PillButton>
                <p className="lp-dl-fine">Instant download. No payment, no obligation — unsubscribe anytime.</p>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 4px" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    background: "var(--stone)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Icon name="check" size={26} color="var(--amber)" stroke={2.5} />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 21,
                    fontWeight: 600,
                    color: "var(--navy)",
                    lineHeight: 1.15,
                  }}
                >
                  Check your inbox
                </div>
                <p style={{ fontSize: 13.5, color: "var(--fg-muted)", margin: "10px auto 0", lineHeight: 1.5, maxWidth: 280 }}>
                  Your resource kit is on its way to <strong style={{ color: "var(--navy)" }}>{f.email}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Before → After proof (autoplaying transformation video) ──
export function Proof() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, []);
  return (
    <section className="lp-proof">
      <div className="lp-shell lp-proof-feature">
        <div className="lp-proof-copy">
          <Eyebrow amber>Real projects</Eyebrow>
          <h2 className="lp-h2">The difference buyers pay for.</h2>
          <p className="lp-sec-sub">
            Today’s buyers scroll past tired listings. Watch an outdated space become move-in ready — the kind of
            home that wins showings, draws offers, and sells for more, without your seller writing a check before
            closing.
          </p>
          <ul className="lp-proof-points">
            <li>
              <Icon name="check" size={18} color="var(--amber)" stroke={2.5} /> Design, materials &amp; full project
              management — handled
            </li>
            <li>
              <Icon name="check" size={18} color="var(--amber)" stroke={2.5} /> On time, on budget, overseen by your
              local expert
            </li>
            <li>
              <Icon name="check" size={18} color="var(--amber)" stroke={2.5} /> $0 out of pocket — your seller pays at
              close
            </li>
          </ul>
        </div>
        <figure className="lp-proof-video">
          <div className="lp-proof-frame">
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/proof/before-after-poster.jpg"
            >
              <source src="/proof/before-after.webm" type="video/webm" />
              <source src="/proof/before-after.mp4" type="video/mp4" />
            </video>
            <span className="lp-proof-vtag">
              Before <Icon name="arrow" size={13} color="currentColor" /> After
            </span>
          </div>
          <figcaption>A real Curbio transformation, start to finish.</figcaption>
        </figure>
      </div>
    </section>
  );
}

// ── Navy closer ──
export function Closer({
  market,
  onQuote,
  onZip,
}: {
  market: ResolvedMarket | null;
  onQuote: () => void;
  onZip: () => void;
}) {
  return (
    <section className="lp-closer">
      <div className="lp-shell lp-closer-inner">
        <div>
          <Eyebrow amber>Ready when you are</Eyebrow>
          <h2 className="lp-closer-h">
            List with confidence. We’ll <em>take care</em> of the rest.
          </h2>
          <p className="lp-closer-sub">
            Your local Home Services Manager is ready to scope your project — free, with no obligation, and nothing due
            until the home sells.
          </p>
        </div>
        <div className="lp-closer-cta">
          <PillButton size="lg" onClick={onQuote}>
            Get a free quote
          </PillButton>
          {market ? (
            <PillButton size="lg" variant="ghostNavy" icon="calendar" href={market.hsm.calendlyUrl} target="_blank">
              Speak with {market.hsm.firstName}
            </PillButton>
          ) : (
            <PillButton size="lg" variant="ghostNavy" icon="pin" onClick={onZip}>
              Find your market
            </PillButton>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Waitlist page (out-of-area state) ──
export function WaitlistPage({
  zip,
  geoCity,
  geoRegion,
  onChooseMarket,
}: {
  zip: string;
  geoCity?: string;
  geoRegion?: string;
  onChooseMarket: () => void;
}) {
  const [f, setF] = useState({ name: "", email: "", zip: zip });
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  // Keep local zip in sync if parent zip changes (e.g. navigation).
  useEffect(() => { setF((s) => ({ ...s, zip })); }, [zip]);

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const valid =
    f.name.trim().length > 0 &&
    validEmail(f.email) &&
    f.zip.replace(/\D/g, "").length === 5;

  async function submit() {
    if (!valid || pending) return;
    setPending(true);
    setServerErr(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          email: f.email.trim(),
          zip: f.zip.replace(/\D/g, "").slice(0, 5),
          detectedCity: geoCity || undefined,
          detectedRegion: geoRegion || undefined,
          source: "waitlist",
          submittedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setSent(true);
    } catch (e) {
      setServerErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const displayZip = f.zip.replace(/\D/g, "").slice(0, 5) || zip || "your area";

  return (
    <section className="lp-waitlist">
      <div className="lp-shell lp-waitlist-inner">
        {!sent ? (
          <>
            <Eyebrow amber style={{ marginBottom: 14 }}>Coming to your area</Eyebrow>
            <h1 className="lp-waitlist-h1">
              Curbio isn't in your area <em>yet</em>.
            </h1>
            <p className="lp-waitlist-sub">
              We're expanding fast. Add your details and we'll reach out the moment
              a local Curbio team covers your area.
            </p>
            <AmberRule width={56} style={{ margin: "22px 0 26px" }} />
            <div className="lp-waitlist-fields">
              <Field label="Full name" value={f.name} onChange={set("name")} required />
              <Field label="Work email" type="email" value={f.email} onChange={set("email")} required />
              <Field
                label="ZIP code"
                value={f.zip}
                onChange={(v) => set("zip")(v.replace(/\D/g, "").slice(0, 5))}
                required
                inputMode="numeric"
                maxLength={5}
                placeholder="e.g. 80202"
              />
            </div>
            {serverErr && (
              <p
                role="alert"
                style={{
                  fontSize: 13,
                  color: "var(--amber-120)",
                  background: "var(--stone)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  margin: "0 0 14px",
                  lineHeight: 1.45,
                }}
              >
                {serverErr}
              </p>
            )}
            <PillButton full size="lg" disabled={!valid || pending} onClick={submit}>
              {pending ? "Joining…" : "Join the waitlist"}
            </PillButton>
            <p style={{ fontSize: 11.5, color: "var(--fg-subtle)", margin: "12px 0 0", lineHeight: 1.4 }}>
              By submitting you agree to receive email updates from Curbio. We never share your information.
            </p>
            <div className="lp-waitlist-alt">
              <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>
                Already in a Curbio market?
              </span>{" "}
              <button
                onClick={onChooseMarket}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--amber)",
                  background: "none",
                  border: 0,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Choose your market →
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", maxWidth: 440, margin: "0 auto", padding: "20px 0" }}>
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 999,
                background: "var(--stone)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 22px",
              }}
            >
              <Icon name="check" size={28} color="var(--amber)" stroke={2.5} />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 28,
                fontWeight: 600,
                color: "var(--navy)",
                margin: "0 0 12px",
                lineHeight: 1.1,
              }}
            >
              You're on the list.
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "var(--fg-muted)",
                lineHeight: 1.6,
                margin: "0 0 28px",
              }}
            >
              We'll let you know the moment Curbio reaches{" "}
              <strong style={{ color: "var(--navy)" }}>{displayZip}</strong>.
            </p>
            <button
              onClick={onChooseMarket}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--amber)",
                background: "none",
                border: 0,
                cursor: "pointer",
              }}
            >
              See our current markets →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Footer ──
export function Footer({ onZip }: { onZip: () => void }) {
  return (
    <footer className="lp-foot">
      <div className="lp-shell lp-foot-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO} alt="Curbio" style={{ height: 26 }} />
        <button
          className="lp-link"
          onClick={onZip}
          style={{ color: "#C7CFDB", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
        >
          <Icon name="pin" size={14} color="var(--amber)" />
          Find your market
        </button>
        <div className="lp-foot-tag">The pre-listing home improvement experts.</div>
      </div>
    </footer>
  );
}
