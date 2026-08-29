// Curbio Landing — main page. Load AFTER React + Babel + ui.jsx + modals.jsx + data.js.
const { useState, useEffect } = React;

function App() {
  const [market, setMarket] = useState(window.CURBIO_MARKETS[0]);
  const [detected, setDetected] = useState(false); // geo banner reveal
  const [modal, setModal] = useState(null); // 'zip'|'quote'|'schedule'|null

  // Simulate auto geo-detection on load.
  useEffect(() => {
    const t = setTimeout(() => setDetected(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <React.Fragment>
      <Nav market={market} onQuote={() => setModal('quote')} onZip={() => setModal('zip')} />
      <MarketBar market={market} detected={detected} onZip={() => setModal('zip')} />

      <Hero market={market} onQuote={() => setModal('quote')} onSchedule={() => setModal('schedule')} />

      <SocialProof />
      <Downloads />
      <Proof />
      <Closer market={market} onQuote={() => setModal('quote')} onSchedule={() => setModal('schedule')} />
      <Footer onZip={() => setModal('zip')} market={market} />

      <ZipModal open={modal === 'zip'} onClose={() => setModal(null)} current={market} onPick={setMarket} />
      <QuoteModal open={modal === 'quote'} onClose={() => setModal(null)} market={market} />
      <ScheduleModal open={modal === 'schedule'} onClose={() => setModal(null)} market={market} />
    </React.Fragment>);

}

// ---------- Nav ----------
function Nav({ market, onQuote, onZip }) {
  return (
    <header className="lp-nav">
      <div className="lp-shell lp-nav-inner">
        <img src="assets/logo-wordmark-white.png" alt="Curbio" className="lp-logo" />
        <div className="lp-nav-right">
          <button className="lp-market-chip" onClick={onZip}>
            <Icon name="pin" size={15} color="var(--amber)" />
            <span>{market.market}</span>
          </button>
          <PillButton size="sm" onClick={onQuote}>Get a free quote</PillButton>
        </div>
      </div>
    </header>);

}

// ---------- Geo market bar ----------
function MarketBar({ market, detected, onZip }) {
  return (
    <div className={'lp-geobar' + (detected ? ' show' : '')}>
      <div className="lp-shell lp-geobar-inner">
        <span className="lp-geobar-txt">
          <Icon name="pin" size={14} color="var(--teal-110)" />
          {detected ?
          <span>Located you in <strong>{market.market}</strong> — you’re matched with a local Home Sale Manager.</span> :
          <span>Finding your local market…</span>}
        </span>
        <button className="lp-geobar-link" onClick={onZip}>Not your market? Enter ZIP</button>
      </div>
    </div>);

}

// ---------- Hero with HSM card ----------
function Hero({ market, onQuote, onSchedule }) {
  const hsm = market.hsm;
  return (
    <section className="lp-hero">
      <div className="lp-shell lp-hero-grid">
        <div className="lp-hero-copy">
          <Eyebrow amber style={{ marginBottom: 18 }}>Pre-listing home improvement · {market.region}</Eyebrow>
          <h1 className="lp-hero-h1">Sell faster, for more — <em>without lifting a finger.</em></h1>
          <AmberRule width={64} style={{ margin: '24px 0' }} />
          <p className="lp-hero-sub">Curbio gets your listing market-ready on time and on budget — design, materials, and full project management, handled by one local expert. Pay nothing until the home sells.</p>
          <div className="lp-hero-cta">
            <PillButton size="lg" onClick={onQuote}>Get a free quote</PillButton>
            <PillButton size="lg" variant="secondary" onClick={onSchedule} icon="calendar">Speak with Lisa</PillButton>
            <a className="lp-hero-learn" href="#downloads">Learn more <Icon name="arrow" size={15} color="currentColor" /></a>
          </div>
          <div className="lp-trust">
            <StarRow size={16} />
            <span>Rated 4.9/5 by agents &amp; sellers · Licensed &amp; insured</span>
          </div>
        </div>

        {/* HSM card — trust element */}
        <aside className="lp-hsm">
          <div className="lp-hsm-photo">
            <image-slot id="hsm-headshot" shape="rect" placeholder="Drop Lisa's headshot"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}></image-slot>
            <span className="lp-hsm-badge"><Icon name="pin" size={13} color="#fff" /> {market.market}</span>
          </div>
          <div className="lp-hsm-body">
            <div className="lp-hsm-name">{hsm.name}</div>
            <div className="lp-hsm-title">{hsm.title}</div>
            <p className="lp-hsm-bio">{hsm.bio}</p>
            <div className="lp-hsm-meta">
              <span className="lp-hsm-chip"><Icon name="home" size={14} color="var(--amber)" /> Local to {market.market.split(/[,–]/)[0].trim()}</span>
              <span className="lp-hsm-chip"><span className="lp-hsm-dot"></span> Available now</span>
            </div>
            <a className="lp-hsm-contact" href={`tel:${hsm.phone.replace(/[^\d+]/g, '')}`}>
              <span className="lp-hsm-contact-ic"><Icon name="phone" size={16} color="var(--amber)" /></span>
              <span className="lp-hsm-contact-txt">
                <span className="lp-hsm-contact-lbl">Call {hsm.name.split(' ')[0]} directly</span>
                <span className="lp-hsm-contact-num">{hsm.phone}</span>
              </span>
            </a>
          </div>
        </aside>
      </div>
    </section>);

}

// ---------- Downloads: soft opt-in inline capture ----------
function Downloads() {
  const [f, setF] = useState({ name: '', email: '' });
  const [sent, setSent] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.name && f.email;
  return (
    <section className="lp-dl" id="downloads">
      <div className="lp-shell">
        <div className="lp-dl-inner">
          <div className="lp-dl-copy">
            <Eyebrow amber>Not ready for a quote?</Eyebrow>
            <h2 className="lp-dl-h">Get the agent resource kit.</h2>
            <p className="lp-dl-sub">The materials our top agents bring to every listing appointment — sent straight to your inbox, no strings attached.</p>
            <ul className="lp-dl-list">
              <li><Icon name="doc" size={18} color="var(--amber)" /> Listing presentation</li>
              <li><Icon name="clipboard" size={18} color="var(--amber)" /> Pre-sale home improvement checklist</li>
            </ul>
          </div>
          <div className="lp-dl-card">
            {!sent ?
            <form className="lp-dl-form" onSubmit={(e) => {e.preventDefault();if (valid) setSent(true);}}>
                <Field label="Full name" value={f.name} onChange={set('name')} required />
                <Field label="Work email" type="email" value={f.email} onChange={set('email')} required />
                <PillButton full size="lg" type="submit" disabled={!valid} icon="arrow">Email me the kit</PillButton>
                <p className="lp-dl-fine">Instant download. No payment, no obligation — unsubscribe anytime.</p>
              </form> :

            <div style={{ textAlign: 'center', padding: '8px 4px' }}>
                <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--amber-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid var(--amber-30)' }}>
                  <Icon name="check" size={26} color="var(--amber)" stroke={2.5} />
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.15 }}>Check your inbox</div>
                <p style={{ fontSize: 13.5, color: 'var(--fg-muted)', margin: '10px auto 0', lineHeight: 1.5, maxWidth: 280 }}>
                  Your resource kit is on its way to <strong style={{ color: 'var(--navy)' }}>{f.email}</strong>.
                </p>
              </div>
            }
          </div>
        </div>
      </div>
    </section>);

}

// ---------- Before / After proof ----------
function Proof() {
  const videoRef = React.useRef(null);
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }, []);
  return (
    <section className="lp-proof">
      <div className="lp-shell lp-proof-feature">
        <div className="lp-proof-copy">
          <Eyebrow amber>Real projects</Eyebrow>
          <h2 className="lp-h2">The difference buyers pay for.</h2>
          <p className="lp-sec-sub">Today’s buyers scroll past tired listings. Watch an outdated space become move-in ready — the kind of home that wins showings, draws offers, and sells for more.</p>
          <ul className="lp-proof-points">
            <li><Icon name="check" size={18} color="var(--amber)" stroke={2.5} /> Design, materials &amp; full project management — handled</li>
            <li><Icon name="check" size={18} color="var(--amber)" stroke={2.5} /> On time, on budget, overseen by your local expert</li>
            <li><Icon name="check" size={18} color="var(--amber)" stroke={2.5} /> $0 out of pocket — pay only when the home sells</li>
          </ul>
        </div>
        <figure className="lp-proof-video">
          <div className="lp-proof-frame">
            <video ref={videoRef} autoPlay muted loop playsInline preload="auto" poster="">
              <source src="assets/before-after.mp4" type="video/mp4" />
            </video>
            <span className="lp-proof-vtag">Before <Icon name="arrow" size={13} color="currentColor" /> After</span>
          </div>
          <figcaption>A real Curbio transformation, start to finish.</figcaption>
        </figure>
      </div>
    </section>);

}

// ---------- Social proof: featured quote + stats + agent carousel ----------
function SocialProof() {
  const items = window.CURBIO_TESTIMONIALS; // all five
  const stats = [
  { n: '$400', l: 'The potential return of every $100 you invest in staging your home', src: 'National Association of Realtors, 2022' },
  { n: '8,000+', l: 'Homes prepped', src: 'National Association of Realtors, 2019' },
  { n: '$0', l: 'Until the home sells*', src: 'National Association of Realtors, 2024' }];

  const trackRef = React.useRef(null);
  const scroll = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector('.lp-tcard');
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 24) || 24;
    const step = card ? card.offsetWidth + gap : track.clientWidth;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };
  return (
    <React.Fragment>
      <section className="lp-testis" id="social">
        <div className="lp-shell">
          <div className="lp-testis-head">
            <Eyebrow amber>Loved by agents</Eyebrow>
            <h2 className="lp-h2">Agents nationwide <em>count on Curbio.</em></h2>
          </div>

          <div className="lp-carousel">
            <button className="lp-carousel-arrow prev" onClick={() => scroll(-1)} aria-label="Previous testimonials">
              <Icon name="arrow" size={20} color="currentColor" style={{ transform: 'rotate(180deg)' }} />
            </button>
            <div className="lp-carousel-track" ref={trackRef}>
              {items.map((t, i) =>
              <figure key={i} className="lp-tcard">
                  <span className="lp-tcard-mark">&ldquo;</span>
                  <blockquote className="lp-tcard-quote">{t.quote}</blockquote>
                  <figcaption className="lp-tcard-foot">
                    <div className="lp-tcard-name">{t.name}</div>
                    <div className="lp-tcard-title">{t.title}</div>
                    <div className="lp-tcard-loc">{t.location}</div>
                  </figcaption>
                </figure>
              )}
            </div>
            <button className="lp-carousel-arrow next" onClick={() => scroll(1)} aria-label="Next testimonials">
              <Icon name="arrow" size={20} color="currentColor" />
            </button>
          </div>
        </div>
      </section>

      <section className="lp-stats" id="stats">
        <div className="lp-shell">
          <div className="lp-statrow">
            {stats.map((s, i) =>
            <div key={i} className="lp-statcell">
                <div className="lp-statcell-n">{s.n}</div>
                <div className="lp-statcell-l">{s.l}</div>
              </div>
            )}
          </div>
          <p className="lp-statsrc">Source (left to right): National Association of Realtors — 2022, 2019, 2024</p>
        </div>
      </section>
    </React.Fragment>);

}

// ---------- Navy closer ----------
function Closer({ market, onQuote, onSchedule }) {
  return (
    <section className="lp-closer">
      <div className="lp-shell lp-closer-inner">
        <div>
          <Eyebrow amber>Ready when you are</Eyebrow>
          <h2 className="lp-closer-h">List with confidence. We’ll <em>take care</em> of the rest.</h2>
          <p className="lp-closer-sub">Your local Home Sale Manager, {market.hsm.name}, is ready to scope your project — free, with no obligation.</p>
        </div>
        <div className="lp-closer-cta">
          <PillButton size="lg" onClick={onQuote}>Get a free quote</PillButton>
          <PillButton size="lg" variant="ghostNavy" onClick={onSchedule} icon="calendar">Speak with our team</PillButton>
        </div>
      </div>
    </section>);

}

// ---------- Footer ----------
function Footer({ onZip, market }) {
  return (
    <footer className="lp-foot">
      <div className="lp-shell lp-foot-inner">
        <img src="assets/logo-wordmark-white.png" alt="Curbio" style={{ height: 26 }} />
        <button className="lp-link" onClick={onZip} style={{ color: '#C7CFDB' }}>
          <Icon name="pin" size={14} color="var(--amber)" style={{ verticalAlign: '-2px', marginRight: 4 }} />
          Serving {market.market} · Change market
        </button>
        <div className="lp-foot-tag">The pre-listing home improvement experts.</div>
      </div>
    </footer>);

}

const rootEl = document.getElementById('root');
if (rootEl) ReactDOM.createRoot(rootEl).render(<App />);