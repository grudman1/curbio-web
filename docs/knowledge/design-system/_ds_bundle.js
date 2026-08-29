/* @ds-bundle: {"format":4,"namespace":"CurbioDesignSystem_882732","components":[{"name":"AgentBrochure","sourcePath":"ui_kits/brochures/AgentBrochure.jsx"},{"name":"PANEL_W","sourcePath":"ui_kits/brochures/Brochure.jsx"},{"name":"PANEL_H","sourcePath":"ui_kits/brochures/Brochure.jsx"},{"name":"Panel","sourcePath":"ui_kits/brochures/Brochure.jsx"},{"name":"Brochure","sourcePath":"ui_kits/brochures/Brochure.jsx"},{"name":"BrokerageBrochure","sourcePath":"ui_kits/brochures/BrokerageBrochure.jsx"},{"name":"HomeownerBrochure","sourcePath":"ui_kits/brochures/HomeownerBrochure.jsx"},{"name":"Wordmark","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"HouseMark","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"Eyebrow","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"AmberRule","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"SerifH","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"PullQuote","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"StarRow","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"PillButton","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"BeforeAfter","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"IconDisc","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"Icon","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"FeatureRow","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"QRDisc","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"ComparisonTable","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"NavyCloser","sourcePath":"ui_kits/brochures/primitives.jsx"},{"name":"NavyBrandBar","sourcePath":"ui_kits/brochures/primitives.jsx"}],"sourceHashes":{"landing/app.jsx":"efc30785ebea","landing/data.js":"6cd918124e58","landing/image-slot.js":"9309434cb09c","landing/modals.jsx":"eff4c89111eb","landing/ui.jsx":"f7710c4b592e","ui_kits/brochures/AgentBrochure.jsx":"ee2fb52416ed","ui_kits/brochures/Brochure.jsx":"a818ae7c9d76","ui_kits/brochures/BrokerageBrochure.jsx":"5fc90788de37","ui_kits/brochures/HomeownerBrochure.jsx":"9179952aeb35","ui_kits/brochures/primitives.jsx":"71da0483219e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CurbioDesignSystem_882732 = window.CurbioDesignSystem_882732 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// landing/app.jsx
try { (() => {
// Curbio Landing — main page. Load AFTER React + Babel + ui.jsx + modals.jsx + data.js.
const {
  useState,
  useEffect
} = React;
function App() {
  const [market, setMarket] = useState(window.CURBIO_MARKETS[0]);
  const [detected, setDetected] = useState(false); // geo banner reveal
  const [modal, setModal] = useState(null); // 'zip'|'quote'|'schedule'|null

  // Simulate auto geo-detection on load.
  useEffect(() => {
    const t = setTimeout(() => setDetected(true), 900);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Nav, {
    market: market,
    onQuote: () => setModal('quote'),
    onZip: () => setModal('zip')
  }), /*#__PURE__*/React.createElement(MarketBar, {
    market: market,
    detected: detected,
    onZip: () => setModal('zip')
  }), /*#__PURE__*/React.createElement(Hero, {
    market: market,
    onQuote: () => setModal('quote'),
    onSchedule: () => setModal('schedule')
  }), /*#__PURE__*/React.createElement(SocialProof, null), /*#__PURE__*/React.createElement(Downloads, null), /*#__PURE__*/React.createElement(Proof, null), /*#__PURE__*/React.createElement(Closer, {
    market: market,
    onQuote: () => setModal('quote'),
    onSchedule: () => setModal('schedule')
  }), /*#__PURE__*/React.createElement(Footer, {
    onZip: () => setModal('zip'),
    market: market
  }), /*#__PURE__*/React.createElement(ZipModal, {
    open: modal === 'zip',
    onClose: () => setModal(null),
    current: market,
    onPick: setMarket
  }), /*#__PURE__*/React.createElement(QuoteModal, {
    open: modal === 'quote',
    onClose: () => setModal(null),
    market: market
  }), /*#__PURE__*/React.createElement(ScheduleModal, {
    open: modal === 'schedule',
    onClose: () => setModal(null),
    market: market
  }));
}

// ---------- Nav ----------
function Nav({
  market,
  onQuote,
  onZip
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "lp-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-shell lp-nav-inner"
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/logo-wordmark-white.png",
    alt: "Curbio",
    className: "lp-logo"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lp-nav-right"
  }, /*#__PURE__*/React.createElement("button", {
    className: "lp-market-chip",
    onClick: onZip
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 15,
    color: "var(--amber)"
  }), /*#__PURE__*/React.createElement("span", null, market.market)), /*#__PURE__*/React.createElement(PillButton, {
    size: "sm",
    onClick: onQuote
  }, "Get a free quote"))));
}

// ---------- Geo market bar ----------
function MarketBar({
  market,
  detected,
  onZip
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'lp-geobar' + (detected ? ' show' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-shell lp-geobar-inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-geobar-txt"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 14,
    color: "var(--teal-110)"
  }), detected ? /*#__PURE__*/React.createElement("span", null, "Located you in ", /*#__PURE__*/React.createElement("strong", null, market.market), " \u2014 you\u2019re matched with a local Home Sale Manager.") : /*#__PURE__*/React.createElement("span", null, "Finding your local market\u2026")), /*#__PURE__*/React.createElement("button", {
    className: "lp-geobar-link",
    onClick: onZip
  }, "Not your market? Enter ZIP")));
}

// ---------- Hero with HSM card ----------
function Hero({
  market,
  onQuote,
  onSchedule
}) {
  const hsm = market.hsm;
  return /*#__PURE__*/React.createElement("section", {
    className: "lp-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-shell lp-hero-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-hero-copy"
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true,
    style: {
      marginBottom: 18
    }
  }, "Pre-listing home improvement \xB7 ", market.region), /*#__PURE__*/React.createElement("h1", {
    className: "lp-hero-h1"
  }, "Sell faster, for more \u2014 ", /*#__PURE__*/React.createElement("em", null, "without lifting a finger.")), /*#__PURE__*/React.createElement(AmberRule, {
    width: 64,
    style: {
      margin: '24px 0'
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "lp-hero-sub"
  }, "Curbio gets your listing market-ready on time and on budget \u2014 design, materials, and full project management, handled by one local expert. Pay nothing until the home sells."), /*#__PURE__*/React.createElement("div", {
    className: "lp-hero-cta"
  }, /*#__PURE__*/React.createElement(PillButton, {
    size: "lg",
    onClick: onQuote
  }, "Get a free quote"), /*#__PURE__*/React.createElement(PillButton, {
    size: "lg",
    variant: "secondary",
    onClick: onSchedule,
    icon: "calendar"
  }, "Speak with Lisa"), /*#__PURE__*/React.createElement("a", {
    className: "lp-hero-learn",
    href: "#downloads"
  }, "Learn more ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow",
    size: 15,
    color: "currentColor"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "lp-trust"
  }, /*#__PURE__*/React.createElement(StarRow, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "Rated 4.9/5 by agents & sellers \xB7 Licensed & insured"))), /*#__PURE__*/React.createElement("aside", {
    className: "lp-hsm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-hsm-photo"
  }, /*#__PURE__*/React.createElement("image-slot", {
    id: "hsm-headshot",
    shape: "rect",
    placeholder: "Drop Lisa's headshot",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "lp-hsm-badge"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 13,
    color: "#fff"
  }), " ", market.market)), /*#__PURE__*/React.createElement("div", {
    className: "lp-hsm-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-hsm-name"
  }, hsm.name), /*#__PURE__*/React.createElement("div", {
    className: "lp-hsm-title"
  }, hsm.title), /*#__PURE__*/React.createElement("p", {
    className: "lp-hsm-bio"
  }, hsm.bio), /*#__PURE__*/React.createElement("div", {
    className: "lp-hsm-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-hsm-chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "home",
    size: 14,
    color: "var(--amber)"
  }), " Local to ", market.market.split(/[,–]/)[0].trim()), /*#__PURE__*/React.createElement("span", {
    className: "lp-hsm-chip"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-hsm-dot"
  }), " Available now")), /*#__PURE__*/React.createElement("a", {
    className: "lp-hsm-contact",
    href: `tel:${hsm.phone.replace(/[^\d+]/g, '')}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-hsm-contact-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 16,
    color: "var(--amber)"
  })), /*#__PURE__*/React.createElement("span", {
    className: "lp-hsm-contact-txt"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-hsm-contact-lbl"
  }, "Call ", hsm.name.split(' ')[0], " directly"), /*#__PURE__*/React.createElement("span", {
    className: "lp-hsm-contact-num"
  }, hsm.phone)))))));
}

// ---------- Downloads: soft opt-in inline capture ----------
function Downloads() {
  const [f, setF] = useState({
    name: '',
    email: ''
  });
  const [sent, setSent] = useState(false);
  const set = k => v => setF(s => ({
    ...s,
    [k]: v
  }));
  const valid = f.name && f.email;
  return /*#__PURE__*/React.createElement("section", {
    className: "lp-dl",
    id: "downloads"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-dl-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-dl-copy"
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true
  }, "Not ready for a quote?"), /*#__PURE__*/React.createElement("h2", {
    className: "lp-dl-h"
  }, "Get the agent resource kit."), /*#__PURE__*/React.createElement("p", {
    className: "lp-dl-sub"
  }, "The materials our top agents bring to every listing appointment \u2014 sent straight to your inbox, no strings attached."), /*#__PURE__*/React.createElement("ul", {
    className: "lp-dl-list"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement(Icon, {
    name: "doc",
    size: 18,
    color: "var(--amber)"
  }), " Listing presentation"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement(Icon, {
    name: "clipboard",
    size: 18,
    color: "var(--amber)"
  }), " Pre-sale home improvement checklist"))), /*#__PURE__*/React.createElement("div", {
    className: "lp-dl-card"
  }, !sent ? /*#__PURE__*/React.createElement("form", {
    className: "lp-dl-form",
    onSubmit: e => {
      e.preventDefault();
      if (valid) setSent(true);
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Full name",
    value: f.name,
    onChange: set('name'),
    required: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Work email",
    type: "email",
    value: f.email,
    onChange: set('email'),
    required: true
  }), /*#__PURE__*/React.createElement(PillButton, {
    full: true,
    size: "lg",
    type: "submit",
    disabled: !valid,
    icon: "arrow"
  }, "Email me the kit"), /*#__PURE__*/React.createElement("p", {
    className: "lp-dl-fine"
  }, "Instant download. No payment, no obligation \u2014 unsubscribe anytime.")) : /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '8px 4px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 999,
      background: 'var(--amber-10)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      border: '1px solid var(--amber-30)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 26,
    color: "var(--amber)",
    stroke: 2.5
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 21,
      fontWeight: 600,
      color: 'var(--navy)',
      lineHeight: 1.15
    }
  }, "Check your inbox"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--fg-muted)',
      margin: '10px auto 0',
      lineHeight: 1.5,
      maxWidth: 280
    }
  }, "Your resource kit is on its way to ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--navy)'
    }
  }, f.email), "."))))));
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
  return /*#__PURE__*/React.createElement("section", {
    className: "lp-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-shell lp-proof-feature"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-proof-copy"
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true
  }, "Real projects"), /*#__PURE__*/React.createElement("h2", {
    className: "lp-h2"
  }, "The difference buyers pay for."), /*#__PURE__*/React.createElement("p", {
    className: "lp-sec-sub"
  }, "Today\u2019s buyers scroll past tired listings. Watch an outdated space become move-in ready \u2014 the kind of home that wins showings, draws offers, and sells for more."), /*#__PURE__*/React.createElement("ul", {
    className: "lp-proof-points"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    color: "var(--amber)",
    stroke: 2.5
  }), " Design, materials & full project management \u2014 handled"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    color: "var(--amber)",
    stroke: 2.5
  }), " On time, on budget, overseen by your local expert"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    color: "var(--amber)",
    stroke: 2.5
  }), " $0 out of pocket \u2014 pay only when the home sells"))), /*#__PURE__*/React.createElement("figure", {
    className: "lp-proof-video"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-proof-frame"
  }, /*#__PURE__*/React.createElement("video", {
    ref: videoRef,
    autoPlay: true,
    muted: true,
    loop: true,
    playsInline: true,
    preload: "auto",
    poster: ""
  }, /*#__PURE__*/React.createElement("source", {
    src: "assets/before-after.mp4",
    type: "video/mp4"
  })), /*#__PURE__*/React.createElement("span", {
    className: "lp-proof-vtag"
  }, "Before ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow",
    size: 13,
    color: "currentColor"
  }), " After")), /*#__PURE__*/React.createElement("figcaption", null, "A real Curbio transformation, start to finish."))));
}

// ---------- Social proof: featured quote + stats + agent carousel ----------
function SocialProof() {
  const items = window.CURBIO_TESTIMONIALS; // all five
  const stats = [{
    n: '$400',
    l: 'The potential return of every $100 you invest in staging your home',
    src: 'National Association of Realtors, 2022'
  }, {
    n: '8,000+',
    l: 'Homes prepped',
    src: 'National Association of Realtors, 2019'
  }, {
    n: '$0',
    l: 'Until the home sells*',
    src: 'National Association of Realtors, 2024'
  }];
  const trackRef = React.useRef(null);
  const scroll = dir => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector('.lp-tcard');
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 24) || 24;
    const step = card ? card.offsetWidth + gap : track.clientWidth;
    track.scrollBy({
      left: dir * step,
      behavior: 'smooth'
    });
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    className: "lp-testis",
    id: "social"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-testis-head"
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true
  }, "Loved by agents"), /*#__PURE__*/React.createElement("h2", {
    className: "lp-h2"
  }, "Agents nationwide ", /*#__PURE__*/React.createElement("em", null, "count on Curbio."))), /*#__PURE__*/React.createElement("div", {
    className: "lp-carousel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "lp-carousel-arrow prev",
    onClick: () => scroll(-1),
    "aria-label": "Previous testimonials"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow",
    size: 20,
    color: "currentColor",
    style: {
      transform: 'rotate(180deg)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "lp-carousel-track",
    ref: trackRef
  }, items.map((t, i) => /*#__PURE__*/React.createElement("figure", {
    key: i,
    className: "lp-tcard"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-tcard-mark"
  }, "\u201C"), /*#__PURE__*/React.createElement("blockquote", {
    className: "lp-tcard-quote"
  }, t.quote), /*#__PURE__*/React.createElement("figcaption", {
    className: "lp-tcard-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-tcard-name"
  }, t.name), /*#__PURE__*/React.createElement("div", {
    className: "lp-tcard-title"
  }, t.title), /*#__PURE__*/React.createElement("div", {
    className: "lp-tcard-loc"
  }, t.location))))), /*#__PURE__*/React.createElement("button", {
    className: "lp-carousel-arrow next",
    onClick: () => scroll(1),
    "aria-label": "Next testimonials"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow",
    size: 20,
    color: "currentColor"
  }))))), /*#__PURE__*/React.createElement("section", {
    className: "lp-stats",
    id: "stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-statrow"
  }, stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "lp-statcell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-statcell-n"
  }, s.n), /*#__PURE__*/React.createElement("div", {
    className: "lp-statcell-l"
  }, s.l)))), /*#__PURE__*/React.createElement("p", {
    className: "lp-statsrc"
  }, "Source (left to right): National Association of Realtors \u2014 2022, 2019, 2024"))));
}

// ---------- Navy closer ----------
function Closer({
  market,
  onQuote,
  onSchedule
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "lp-closer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-shell lp-closer-inner"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true
  }, "Ready when you are"), /*#__PURE__*/React.createElement("h2", {
    className: "lp-closer-h"
  }, "List with confidence. We\u2019ll ", /*#__PURE__*/React.createElement("em", null, "take care"), " of the rest."), /*#__PURE__*/React.createElement("p", {
    className: "lp-closer-sub"
  }, "Your local Home Sale Manager, ", market.hsm.name, ", is ready to scope your project \u2014 free, with no obligation.")), /*#__PURE__*/React.createElement("div", {
    className: "lp-closer-cta"
  }, /*#__PURE__*/React.createElement(PillButton, {
    size: "lg",
    onClick: onQuote
  }, "Get a free quote"), /*#__PURE__*/React.createElement(PillButton, {
    size: "lg",
    variant: "ghostNavy",
    onClick: onSchedule,
    icon: "calendar"
  }, "Speak with our team"))));
}

// ---------- Footer ----------
function Footer({
  onZip,
  market
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: "lp-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-shell lp-foot-inner"
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/logo-wordmark-white.png",
    alt: "Curbio",
    style: {
      height: 26
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "lp-link",
    onClick: onZip,
    style: {
      color: '#C7CFDB'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 14,
    color: "var(--amber)",
    style: {
      verticalAlign: '-2px',
      marginRight: 4
    }
  }), "Serving ", market.market, " \xB7 Change market"), /*#__PURE__*/React.createElement("div", {
    className: "lp-foot-tag"
  }, "The pre-listing home improvement experts.")));
}
const rootEl = document.getElementById('root');
if (rootEl) ReactDOM.createRoot(rootEl).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing/app.jsx", error: String((e && e.message) || e) }); }

// landing/data.js
try { (() => {
// Curbio Landing Page — market + Home Sale Manager (HSM) data, lead magnets.
// Plain script, exported to window. No JSX here.

// Each market maps to a local Curbio Home Sale Manager (HSM).
// In production this is resolved from geo / email domain / ZIP lookup.
window.CURBIO_MARKETS = [{
  id: 'dc',
  market: 'Washington, DC Metro',
  region: 'DC · MD · Northern VA',
  zips: ['20', '21', '22'],
  hsm: {
    name: 'Lisa Tucker',
    title: 'Home Sale Manager',
    years: '9 yrs in pre-listing renovation',
    projects: '600+ homes prepped',
    bio: "Lisa has helped DC-area agents and sellers get hundreds of listings market-ready on time and on budget. She scopes the work, builds the plan, and stays accountable from first walkthrough to closing.",
    phone: '(202) 555-0148'
  }
}, {
  id: 'atl',
  market: 'Atlanta, GA',
  region: 'Metro Atlanta · North GA',
  zips: ['30', '31'],
  hsm: {
    name: 'Priya Nair',
    title: 'Home Sale Manager',
    years: '7 yrs in residential construction',
    projects: '450+ homes prepped',
    bio: "Priya partners with Atlanta agents to turn dated listings into move-in ready homes buyers compete for. One plan, one timeline, one accountable point of contact for the whole project.",
    phone: '(404) 555-0192'
  }
}, {
  id: 'dfw',
  market: 'Dallas–Fort Worth, TX',
  region: 'DFW Metroplex',
  zips: ['75', '76'],
  hsm: {
    name: 'Diego Ramos',
    title: 'Home Sale Manager',
    years: '11 yrs as a licensed GC',
    projects: '700+ homes prepped',
    bio: "Diego leads pre-listing projects across the Metroplex — design, materials, and full project management coordinated for you. He keeps sellers stress-free and agents looking great with their clients.",
    phone: '(214) 555-0175'
  }
}, {
  id: 'tpa',
  market: 'Tampa Bay, FL',
  region: 'Tampa · St. Pete · Clearwater',
  zips: ['33', '34'],
  hsm: {
    name: 'Sarah Whitfield',
    title: 'Home Sale Manager',
    years: '8 yrs in home renovation',
    projects: '500+ homes prepped',
    bio: "Sarah helps Tampa Bay sellers update before they list — without lifting a finger or paying a dime until closing. She handles the contractors so your clients can focus on the move.",
    phone: '(813) 555-0133'
  }
}];

// Agent testimonials — real-feel quotes shown in the testimonials grid.
// Headshots are intentionally left as branded placeholders (no fake imagery).
window.CURBIO_TESTIMONIALS = [{
  quote: 'Curbio made me look like a rock star real estate agent. I highly recommend using Curbio for all your renovation needs — it’s really a no-brainer!',
  name: 'Alicia Hill',
  title: 'Agent, eXp Realty',
  location: 'Austin, Texas'
}, {
  quote: 'I think every project is great for Curbio — it’s very rare when there isn’t anything needed to enhance value for the seller.',
  name: 'Dale Mattison',
  title: 'Agent, Long & Foster',
  location: 'Bethesda, Maryland'
}, {
  quote: 'Curbio is a fantastic opportunity for homes to get a quick update and appeal to buyers.',
  name: 'Heidi Wurstle',
  title: 'Agent, Baird & Warner',
  location: 'Chicago, Illinois'
}, {
  quote: 'You sit down with Curbio, you tell them what you need, they take care of it, and you get the house on the market. I count on Curbio to deliver and get me to that closing day. It’s as easy as 1, 2, 3.',
  name: 'Peter MacDonald',
  title: 'Agent, BHHS Fox & Roach',
  location: 'Newton, Pennsylvania'
}, {
  quote: 'I love having Curbio oversee the work I typically have to manage. It allows me to focus on other clients because I’m not tied up in one transaction.',
  name: 'Danan Powell',
  title: 'Broker, Compass',
  location: 'Seattle, Washington'
}];

// Lead magnet #1 — evergreen homeowner / agent decision guide.
// Lead magnet #2 — rotates seasonally on a "turn listings into sales" theme.
window.CURBIO_MAGNETS = {
  guide1: {
    id: 'guide1',
    kicker: 'Free guide',
    title: 'The Move-In Ready Advantage',
    sub: 'Why fix-first, pay-at-closing is the easy yes for today’s sellers.',
    pages: '14-page digital guide',
    bullets: ['What "move-in ready" is really worth in today’s market', 'How fix-first beats price cuts and concessions', 'Pay-at-closing, explained — $0 out of pocket for qualified sellers', 'Why a pre-listing concierge specialist saves the deal']
  },
  guide2: {
    id: 'guide2',
    kicker: 'Free report · Updated for Spring 2026',
    title: 'The Top 12 Things That Turn Listings Into Sales This Spring',
    sub: 'The seasonal punch-list our Home Sale Managers use to win competitive listings.',
    pages: '12-point seasonal report',
    bullets: ['The 12 highest-ROI updates buyers reward this spring', 'Curb-appeal moves that drive showings and offers', 'Where sellers waste money — and what to skip', 'A pre-list timeline that keeps you on schedule'],
    rotates: true
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing/data.js", error: String((e && e.message) || e) }); }

// landing/image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing/image-slot.js", error: String((e && e.message) || e) }); }

// landing/modals.jsx
try { (() => {
// Curbio Landing — modal flows. Load AFTER React + Babel + ui.jsx.
// Exports to window: ZipModal, QuoteModal, ScheduleModal, MagnetModal.
const {
  useState
} = React;

// ---------- ZIP / market switcher ----------
function ZipModal({
  open,
  onClose,
  current,
  onPick
}) {
  const [zip, setZip] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    const m = window.CURBIO_MARKETS.find(x => x.zips.some(p => zip.trim().startsWith(p)));
    if (!m) {
      setErr('We’re expanding fast — we don’t have a local team in that ZIP yet. Try 20001, 30301, 75201, or 33601.');
      return;
    }
    onPick(m);
    setZip('');
    setErr('');
    onClose();
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    maxWidth: 460
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true
  }, "Find your market"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 26,
      fontWeight: 600,
      color: 'var(--navy)',
      margin: '10px 0 6px',
      lineHeight: 1.1
    }
  }, "Enter your ZIP code"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--fg-muted)',
      margin: '0 0 18px',
      lineHeight: 1.5
    }
  }, "We\u2019ll connect you with the Curbio Home Sale Manager who covers your area."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "lp-input",
    inputMode: "numeric",
    placeholder: "e.g. 20001",
    value: zip,
    onChange: e => {
      setZip(e.target.value);
      setErr('');
    },
    onKeyDown: e => e.key === 'Enter' && submit(),
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(PillButton, {
    onClick: submit,
    icon: "arrow"
  }, "Find")), err && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: 'var(--amber-120)',
      margin: '12px 0 0',
      lineHeight: 1.45
    }
  }, err), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      paddingTop: 16,
      borderTop: '1px solid var(--stone)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--fg-subtle)',
      marginBottom: 10
    }
  }, "Currently serving"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, window.CURBIO_MARKETS.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.id,
    className: "lp-chip",
    onClick: () => {
      onPick(m);
      onClose();
    },
    style: {
      borderColor: m.id === current.id ? 'var(--amber)' : 'var(--stone)',
      color: m.id === current.id ? 'var(--amber)' : 'var(--navy)'
    }
  }, m.market)))));
}

// ---------- Free quote request ----------
function QuoteModal({
  open,
  onClose,
  market
}) {
  const [f, setF] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'Home seller'
  });
  const [sent, setSent] = useState(false);
  const set = k => v => setF(s => ({
    ...s,
    [k]: v
  }));
  const close = () => {
    setSent(false);
    onClose();
  };
  const valid = f.name && f.email && f.address;
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: close,
    maxWidth: 500
  }, !sent ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true
  }, "Free, no-obligation"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 27,
      fontWeight: 600,
      color: 'var(--navy)',
      margin: '10px 0 6px',
      lineHeight: 1.08
    }
  }, "Get your project quote"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--fg-muted)',
      margin: '0 0 20px',
      lineHeight: 1.5
    }
  }, market.hsm.name, ", your local Home Sale Manager, will scope the work and send a clear estimate \u2014 no cost, no commitment."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Full name",
    value: f.name,
    onChange: set('name'),
    required: true,
    half: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Phone",
    type: "tel",
    value: f.phone,
    onChange: set('phone'),
    half: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    type: "email",
    value: f.email,
    onChange: set('email'),
    required: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Property address",
    value: f.address,
    onChange: set('address'),
    placeholder: "Street, City, State",
    required: true
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--navy)'
    }
  }, "I am a"), /*#__PURE__*/React.createElement("select", {
    className: "lp-input",
    value: f.role,
    onChange: e => set('role')(e.target.value)
  }, /*#__PURE__*/React.createElement("option", null, "Home seller"), /*#__PURE__*/React.createElement("option", null, "Real estate agent"), /*#__PURE__*/React.createElement("option", null, "Brokerage / team")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(PillButton, {
    full: true,
    size: "lg",
    disabled: !valid,
    onClick: () => setSent(true)
  }, "Request my free quote")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11.5,
      color: 'var(--fg-subtle)',
      margin: '12px 0 0',
      textAlign: 'center',
      lineHeight: 1.4
    }
  }, "No payment until your home sells. Financing for qualified sellers.")) : /*#__PURE__*/React.createElement(SuccessPanel, {
    title: "Request received",
    body: /*#__PURE__*/React.createElement("span", null, market.hsm.name, " will reach out within one business day to schedule your walkthrough. Keep an eye on ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--navy)'
      }
    }, f.email || 'your inbox'), "."),
    onClose: close
  }));
}

// ---------- Speak with our team — Calendly-style scheduler ----------
function ScheduleModal({
  open,
  onClose,
  market
}) {
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [booked, setBooked] = useState(false);
  const days = ['Mon 9', 'Tue 10', 'Wed 11', 'Thu 12', 'Fri 13'];
  const slots = ['9:00 AM', '9:30 AM', '10:30 AM', '11:00 AM', '1:00 PM', '2:30 PM', '3:00 PM', '4:00 PM'];
  const close = () => {
    setDay(null);
    setSlot(null);
    setBooked(false);
    onClose();
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: close,
    maxWidth: 560
  }, !booked ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(PhotoPlaceholder, {
    label: "",
    style: {
      width: 52,
      height: 52,
      borderRadius: 999,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true,
    style: {
      marginBottom: 3
    }
  }, "15-min intro call"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 22,
      fontWeight: 600,
      color: 'var(--navy)',
      lineHeight: 1.1
    }
  }, "Speak with ", market.hsm.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      color: 'var(--fg-subtle)',
      marginBottom: 14,
      padding: '8px 12px',
      background: 'var(--cloud-white)',
      border: '1px dashed var(--border-strong)',
      borderRadius: 8
    }
  }, "Calendly embed \u2014 ", market.hsm.name.toLowerCase().replace(' ', ''), "-curbio \xB7 ", market.market), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--navy)',
      marginBottom: 10
    }
  }, "Pick a day"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5,1fr)',
      gap: 8,
      marginBottom: 18
    }
  }, days.map(d => /*#__PURE__*/React.createElement("button", {
    key: d,
    className: "lp-slot",
    onClick: () => {
      setDay(d);
      setSlot(null);
    },
    style: {
      borderColor: day === d ? 'var(--amber)' : 'var(--stone)',
      background: day === d ? 'var(--amber-10)' : '#fff',
      color: 'var(--navy)'
    }
  }, d))), day && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--navy)',
      marginBottom: 10
    }
  }, "Available times \u2014 ", day), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 8,
      marginBottom: 20
    }
  }, slots.map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    className: "lp-slot",
    onClick: () => setSlot(s),
    style: {
      borderColor: slot === s ? 'var(--amber)' : 'var(--stone)',
      background: slot === s ? 'var(--amber)' : '#fff',
      color: slot === s ? '#fff' : 'var(--navy)'
    }
  }, s)))), /*#__PURE__*/React.createElement(PillButton, {
    full: true,
    size: "lg",
    disabled: !slot,
    onClick: () => setBooked(true),
    icon: "calendar"
  }, slot ? `Confirm ${day}, ${slot}` : 'Select a time')) : /*#__PURE__*/React.createElement(SuccessPanel, {
    title: "You\u2019re booked",
    body: /*#__PURE__*/React.createElement("span", null, "Your call with ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--navy)'
      }
    }, market.hsm.name), " is set for ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--navy)'
      }
    }, day, ", ", slot), ". A calendar invite and reminder are on the way."),
    onClose: close
  }));
}

// ---------- Lead magnet: form → permissions → double opt-in → download ----------
function MagnetModal({
  open,
  onClose,
  magnet
}) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    name: '',
    email: '',
    phone: '',
    brokerage: ''
  });
  const [perm, setPerm] = useState({
    email: true,
    call: false,
    text: false
  });
  const [optin, setOptin] = useState(false);
  const set = k => v => setF(s => ({
    ...s,
    [k]: v
  }));
  const close = () => {
    setStep(1);
    setF({
      name: '',
      email: '',
      phone: '',
      brokerage: ''
    });
    setPerm({
      email: true,
      call: false,
      text: false
    });
    setOptin(false);
    onClose();
  };
  if (!magnet) return null;
  const valid = f.name && f.email && f.phone;
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: close,
    maxWidth: 540
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 18
    }
  }, [1, 2, 3].map(n => /*#__PURE__*/React.createElement("span", {
    key: n,
    style: {
      height: 4,
      flex: 1,
      borderRadius: 2,
      background: step >= n ? 'var(--amber)' : 'var(--stone)',
      transition: 'background .2s'
    }
  }))), step === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(PhotoPlaceholder, {
    label: "",
    tone: "navy",
    style: {
      width: 64,
      height: 84,
      borderRadius: 8,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "doc",
    size: 26,
    color: "rgba(255,255,255,0.7)",
    style: {
      position: 'absolute',
      top: 12,
      left: 12
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true,
    style: {
      marginBottom: 4
    }
  }, magnet.kicker), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 21,
      fontWeight: 600,
      color: 'var(--navy)',
      lineHeight: 1.12
    }
  }, magnet.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--fg-subtle)',
      marginTop: 4
    }
  }, magnet.pages))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--fg-muted)',
      margin: '0 0 18px',
      lineHeight: 1.5
    }
  }, magnet.sub, " Tell us where to send it."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Full name",
    value: f.name,
    onChange: set('name'),
    required: true,
    half: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Phone",
    type: "tel",
    value: f.phone,
    onChange: set('phone'),
    required: true,
    half: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    type: "email",
    value: f.email,
    onChange: set('email'),
    required: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Brokerage / company",
    value: f.brokerage,
    onChange: set('brokerage'),
    placeholder: "Optional"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(PillButton, {
    full: true,
    size: "lg",
    disabled: !valid,
    onClick: () => setStep(2),
    icon: "arrow"
  }, "Continue"))), step === 2 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true
  }, "Almost there"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 24,
      fontWeight: 600,
      color: 'var(--navy)',
      margin: '10px 0 6px',
      lineHeight: 1.1
    }
  }, "How can we reach you?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--fg-muted)',
      margin: '0 0 18px',
      lineHeight: 1.5
    }
  }, "Choose how you\u2019d like to hear from your local Curbio team. You can opt out anytime."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 14,
      padding: '18px',
      background: 'var(--cloud-white)',
      borderRadius: 12,
      border: '1px solid var(--stone)'
    }
  }, /*#__PURE__*/React.createElement(CheckRow, {
    checked: perm.email,
    onChange: v => setPerm(s => ({
      ...s,
      email: v
    }))
  }, "Email me the guide and occasional pre-listing tips"), /*#__PURE__*/React.createElement(CheckRow, {
    checked: perm.call,
    onChange: v => setPerm(s => ({
      ...s,
      call: v
    }))
  }, "Call me about getting a home market-ready"), /*#__PURE__*/React.createElement(CheckRow, {
    checked: perm.text,
    onChange: v => setPerm(s => ({
      ...s,
      text: v
    }))
  }, "Text me \u2014 the fastest way to reach my Home Sale Manager")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      paddingTop: 16,
      borderTop: '1px solid var(--stone)'
    }
  }, /*#__PURE__*/React.createElement(CheckRow, {
    checked: optin,
    onChange: setOptin,
    strong: true
  }, "I agree to receive communications from Curbio at the contact details above and have read the ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      color: 'var(--navy)'
    }
  }, "Privacy Policy"), ". Message & data rates may apply; reply STOP to opt out.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(PillButton, {
    variant: "secondary",
    onClick: () => setStep(1)
  }, "Back"), /*#__PURE__*/React.createElement(PillButton, {
    full: true,
    disabled: !optin,
    onClick: () => setStep(3),
    icon: "mail"
  }, "Send my confirmation"))), step === 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '8px 4px 4px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 62,
      height: 62,
      borderRadius: 999,
      background: 'var(--amber-10)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 18px',
      border: '1px solid var(--amber-30)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 28,
    color: "var(--amber)"
  })), /*#__PURE__*/React.createElement(Eyebrow, {
    amber: true,
    style: {
      textAlign: 'center'
    }
  }, "One last step"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 25,
      fontWeight: 600,
      color: 'var(--navy)',
      margin: '10px 0 8px',
      lineHeight: 1.1
    }
  }, "Confirm your email to unlock the download"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--fg-muted)',
      margin: '0 auto 22px',
      lineHeight: 1.55,
      maxWidth: 380
    }
  }, "We just sent a confirmation link to ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--navy)'
    }
  }, f.email), ". Click it to verify you\u2019re you \u2014 then your copy of ", /*#__PURE__*/React.createElement("em", {
    style: {
      fontStyle: 'normal',
      color: 'var(--amber)'
    }
  }, magnet.title), " downloads instantly. This double opt-in keeps your inbox spam-free and your data yours."), /*#__PURE__*/React.createElement(ConfirmStep, {
    magnet: magnet,
    onClose: close
  })));
}

// Simulates clicking the confirmation link, then reveals the download.
function ConfirmStep({
  magnet,
  onClose
}) {
  const [confirmed, setConfirmed] = useState(false);
  if (!confirmed) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PillButton, {
      size: "lg",
      onClick: () => setConfirmed(true),
      icon: "check",
      style: {
        minWidth: 240
      }
    }, "I\u2019ve confirmed my email"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: 'var(--fg-subtle)',
        margin: '14px 0 0'
      }
    }, "Didn\u2019t get it? Check spam, or ", /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => e.preventDefault(),
      style: {
        color: 'var(--navy)'
      }
    }, "resend"), "."));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--cloud-white)',
      border: '1px solid var(--stone)',
      borderRadius: 12,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      justifyContent: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 20,
    color: "var(--teal)",
    stroke: 2.5
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13.5,
      fontWeight: 700,
      color: 'var(--navy)'
    }
  }, "Email confirmed \u2014 you\u2019re all set")), /*#__PURE__*/React.createElement(PillButton, {
    full: true,
    size: "lg",
    icon: "doc",
    onClick: onClose
  }, "Download ", magnet.pages.includes('report') ? 'the report' : 'the guide'));
}
function SuccessPanel({
  title,
  body,
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '12px 4px 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 62,
      height: 62,
      borderRadius: 999,
      background: 'var(--amber-10)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 18px',
      border: '1px solid var(--amber-30)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 28,
    color: "var(--amber)",
    stroke: 2.5
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 26,
      fontWeight: 600,
      color: 'var(--navy)',
      margin: '0 0 8px',
      lineHeight: 1.1
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--fg-muted)',
      margin: '0 auto 22px',
      lineHeight: 1.55,
      maxWidth: 380
    }
  }, body), /*#__PURE__*/React.createElement(PillButton, {
    size: "lg",
    variant: "secondary",
    onClick: onClose,
    style: {
      minWidth: 160
    }
  }, "Done"));
}
Object.assign(window, {
  ZipModal,
  QuoteModal,
  ScheduleModal,
  MagnetModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing/modals.jsx", error: String((e && e.message) || e) }); }

// landing/ui.jsx
try { (() => {
// Curbio Landing — shared UI primitives. Load AFTER React + Babel.
// Exports to window: Icon, PillButton, Field, CheckRow, PhotoPlaceholder,
// Eyebrow, AmberRule, Modal, StarRow.

const LP_ICONS = {
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z',
  calendar: 'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  clipboard: 'M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2',
  check: 'M20 6L9 17l-5-5',
  arrow: 'M5 12h14 M12 5l7 7-7 7',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  dollar: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  x: 'M18 6L6 18 M6 6l12 12',
  star: 'M12 2l3 7 7 .5L17 14.5 18.5 22 12 18l-6.5 4L7 14.5 2 9.5 9 9z',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  mail: 'M4 4h16v16H4z M22 6l-10 7L2 6',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z'
};
function Icon({
  name,
  size = 24,
  color = 'currentColor',
  stroke = 1.75,
  fill = 'none',
  style
}) {
  const d = LP_ICONS[name];
  if (!d) return null;
  const isFilled = fill !== 'none';
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: fill,
    stroke: isFilled ? fill : color,
    strokeWidth: isFilled ? 0 : stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, d.split(/\s(?=M)/).map((seg, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: seg
  })));
}
function Eyebrow({
  children,
  amber,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: amber ? 'var(--amber)' : 'var(--navy)',
      lineHeight: 1.3,
      ...style
    }
  }, children);
}
function AmberRule({
  width = 56,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width,
      height: 3,
      background: 'var(--amber)',
      borderRadius: 2,
      ...style
    }
  });
}
const lpBtnSizes = {
  sm: {
    padding: '9px 18px',
    fontSize: 13
  },
  md: {
    padding: '13px 24px',
    fontSize: 15
  },
  lg: {
    padding: '16px 30px',
    fontSize: 16
  }
};
function PillButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  full,
  icon,
  style,
  type = 'button',
  disabled
}) {
  const base = {
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    borderRadius: 999,
    border: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .22s var(--ease-out)',
    letterSpacing: '0.01em',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    width: full ? '100%' : 'auto',
    lineHeight: 1.1
  };
  const variants = {
    primary: {
      background: 'var(--amber)',
      color: '#fff'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--navy)',
      border: '1.5px solid var(--navy)'
    },
    onNavy: {
      background: 'var(--amber)',
      color: '#fff'
    },
    ghostNavy: {
      background: 'rgba(255,255,255,0.10)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.22)'
    },
    white: {
      background: '#fff',
      color: 'var(--navy)',
      border: '1px solid var(--stone)'
    }
  };
  const v = variants[variant] || variants.primary;
  const cls = 'lp-btn lp-btn-' + variant + (disabled ? ' lp-btn-disabled' : '');
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    className: cls,
    onClick: disabled ? undefined : onClick,
    style: {
      ...base,
      ...lpBtnSizes[size],
      ...v,
      opacity: disabled ? 0.4 : 1,
      ...style
    }
  }, children, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: size === 'lg' ? 19 : 17,
    color: "currentColor"
  }));
}
function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  hint,
  half
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      gridColumn: half ? 'span 1' : '1 / -1'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--navy)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--amber)'
    }
  }, " *")), /*#__PURE__*/React.createElement("input", {
    className: "lp-input",
    type: type,
    value: value,
    placeholder: placeholder,
    required: required,
    onChange: e => onChange(e.target.value)
  }), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: 'var(--fg-subtle)'
    }
  }, hint));
}
function CheckRow({
  checked,
  onChange,
  children,
  strong
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'flex-start',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      width: 20,
      height: 20,
      marginTop: 1,
      borderRadius: 5,
      border: checked ? '1px solid var(--amber)' : '1.5px solid var(--border-strong)',
      background: checked ? 'var(--amber)' : '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all .15s var(--ease-out)'
    }
  }, checked && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13,
    color: "#fff",
    stroke: 3
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: strong ? 13.5 : 13,
      lineHeight: 1.45,
      color: strong ? 'var(--navy)' : 'var(--fg-muted)',
      fontWeight: strong ? 600 : 400
    }
  }, children), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: e => onChange(e.target.checked),
    style: {
      position: 'absolute',
      opacity: 0,
      pointerEvents: 'none'
    }
  }));
}

// Branded striped placeholder for real photography (per brand: no fake imagery).
function PhotoPlaceholder({
  label,
  tone = 'warm',
  radius = 12,
  style,
  children,
  ratio
}) {
  const bg = tone === 'dim' ? 'repeating-linear-gradient(45deg,#4d473e,#4d473e 14px,#46413a 14px,#46413a 28px)' : tone === 'navy' ? 'repeating-linear-gradient(45deg,#13294f,#13294f 14px,#0f2347 14px,#0f2347 28px)' : 'repeating-linear-gradient(45deg,#ece6dc,#ece6dc 14px,#e3d9cb 14px,#e3d9cb 28px)';
  const labelColor = tone === 'dim' || tone === 'navy' ? 'rgba(255,255,255,0.6)' : 'rgba(13,37,77,0.42)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: bg,
      borderRadius: radius,
      overflow: 'hidden',
      aspectRatio: ratio || undefined,
      ...style
    }
  }, children, label && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 12,
      bottom: 10,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: labelColor,
      letterSpacing: '0.02em'
    }
  }, label));
}
function StarRow({
  count = 5,
  size = 16,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      ...style
    }
  }, Array.from({
    length: count
  }).map((_, i) => /*#__PURE__*/React.createElement(Icon, {
    key: i,
    name: "star",
    size: size,
    fill: "var(--amber)"
  })));
}
function Modal({
  open,
  onClose,
  children,
  maxWidth = 520
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "lp-overlay",
    onMouseDown: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-modal",
    style: {
      maxWidth
    },
    onMouseDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "lp-modal-x",
    onClick: onClose,
    "aria-label": "Close"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18,
    color: "var(--navy)"
  })), children));
}
Object.assign(window, {
  Icon,
  Eyebrow,
  AmberRule,
  PillButton,
  Field,
  CheckRow,
  PhotoPlaceholder,
  StarRow,
  Modal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing/ui.jsx", error: String((e && e.message) || e) }); }

// ui_kits/brochures/Brochure.jsx
try { (() => {
// Tri-fold brochure panel container. One brochure = 3 panels in a row.
// Default panel size: 3.66" × 8.5" at 96 DPI ≈ 351 × 816 px.
// We render at a tighter digital scale: 320 × 760 px per panel.

const PANEL_W = 320;
const PANEL_H = 780;
function Panel({
  children,
  bg = 'var(--cloud-white)',
  noPadding = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: PANEL_W,
      minHeight: PANEL_H,
      background: bg,
      padding: noPadding ? 0 : '28px 24px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      ...style
    }
  }, children);
}

// A brochure is laid out as three panels in order: Cover (right when folded),
// Inside spread (left + middle), Back panel. We render flat / printable order:
// [back] [front cover] [inside-A] [inside-B] [inside-C] [back-inside]
// For a simpler digital preview, we render three panels side by side per face:
// Front face = [Inside-Left | Inside-Middle | Cover]
// Inside face = three full content panels
// Here for the digital recreation we just show one face with 3 panels.

function Brochure({
  children,
  label,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--fg-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      boxShadow: '0 24px 60px -20px rgba(13,37,77,0.25), 0 8px 20px -8px rgba(13,37,77,0.12)',
      borderRadius: 4,
      overflow: 'hidden',
      background: 'var(--cloud-white)',
      // Fold lines between panels
      gap: 0
    }
  }, React.Children.map(children, (child, i) => /*#__PURE__*/React.createElement(React.Fragment, null, child, i < React.Children.count(children) - 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      background: 'rgba(13,37,77,0.06)',
      flexShrink: 0
    }
  })))));
}
Object.assign(__ds_scope, { PANEL_W, PANEL_H, Panel, Brochure });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/brochures/Brochure.jsx", error: String((e && e.message) || e) }); }

// ui_kits/brochures/primitives.jsx
try { (() => {
// Curbio brochure primitives — building blocks for all three tri-folds.
// Load AFTER React + Babel.
// ESM exports: Wordmark, HouseMark, Eyebrow, AmberRule, SerifH,
// PillButton, BeforeAfter, FeatureRow, QRDisc, StarRow, ComparisonTable,
// NavyFooter, PullQuote, IconDisc, Icon.

const cx = (...a) => a.filter(Boolean).join(' ');

// ---------- Logos ----------
function Wordmark({
  variant = 'navy',
  height = 36,
  style
}) {
  const src = variant === 'white' ? '../../assets/logo-wordmark-white.png' : '../../assets/logo-wordmark-navy.png';
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "Curbio",
    style: {
      height,
      width: 'auto',
      display: 'block',
      ...style
    }
  });
}
function HouseMark({
  variant = 'amber',
  size = 32,
  style
}) {
  const src = variant === 'c' ? '../../assets/logo-house-c.png' : '../../assets/logo-house-amber.png';
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: size,
      height: size,
      display: 'block',
      ...style
    }
  });
}

// ---------- Type primitives ----------
function Eyebrow({
  children,
  amber,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: amber ? 'var(--amber)' : 'var(--navy)',
      lineHeight: 1.2,
      ...style
    }
  }, children);
}
function AmberRule({
  width = 56,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width,
      height: 3,
      background: 'var(--amber)',
      borderRadius: 2,
      ...style
    }
  });
}

// Serif headline. `em` text inside <em> tags goes amber italic.
function SerifH({
  size = 38,
  color = 'var(--navy)',
  children,
  style,
  italic = false
}) {
  return /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: size,
      lineHeight: 1.05,
      letterSpacing: '-0.015em',
      color,
      fontWeight: 500,
      fontStyle: italic ? 'italic' : 'normal',
      margin: 0,
      textWrap: 'balance',
      ...style
    }
  }, children);
}
function PullQuote({
  children,
  cite,
  stars = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      paddingLeft: 24,
      paddingTop: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: -2,
      top: -14,
      fontFamily: 'var(--font-serif)',
      fontSize: 64,
      lineHeight: 1,
      color: 'var(--amber)'
    }
  }, "\u201C"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontStyle: 'normal',
      fontSize: 14,
      lineHeight: 1.55,
      color: 'var(--navy)'
    }
  }, children), cite && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 700,
      marginTop: 10,
      color: 'var(--navy)',
      letterSpacing: '0.02em'
    }
  }, "\u2014 ", cite), stars > 0 && /*#__PURE__*/React.createElement(StarRow, {
    count: stars,
    style: {
      marginTop: 6
    }
  }));
}
function StarRow({
  count = 5,
  size = 14,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      ...style
    }
  }, Array.from({
    length: count
  }).map((_, i) => /*#__PURE__*/React.createElement("svg", {
    key: i,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "#CD8629",
    stroke: "#CD8629",
    strokeWidth: "1"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9"
  }))));
}

// ---------- Buttons ----------
function PillButton({
  children,
  variant = 'primary',
  size = 'md',
  style,
  onClick
}) {
  const base = {
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    borderRadius: 999,
    border: 0,
    cursor: 'pointer',
    transition: 'all .2s var(--ease-out)',
    letterSpacing: '0.01em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8
  };
  const sizes = {
    sm: {
      padding: '8px 16px',
      fontSize: 12
    },
    md: {
      padding: '12px 22px',
      fontSize: 14
    },
    lg: {
      padding: '14px 28px',
      fontSize: 15
    }
  };
  const variants = {
    primary: {
      background: 'var(--amber)',
      color: '#fff'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--navy)',
      border: '1.5px solid var(--navy)'
    },
    onNavy: {
      background: 'var(--amber)',
      color: '#fff'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      ...base,
      ...sizes[size],
      ...variants[variant],
      ...style
    }
  }, children);
}

// ---------- Before / After photo pair ----------
// Pass `before` and `after` as image src strings. If omitted, a placeholder
// gradient stands in (tagged with a stripe so it reads as "needs real photo").
function BeforeAfter({
  before,
  after,
  orientation = 'vertical'
}) {
  const Photo = ({
    src,
    kind
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '4 / 3',
      borderRadius: 8,
      overflow: 'hidden',
      background: src ? `url(${src}) center/cover no-repeat` : kind === 'before' ? 'linear-gradient(135deg,#6b6358 0%,#3a342d 100%)' : 'linear-gradient(135deg,#f5efe6 0%,#d4c5b0 100%)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 10,
      top: 10,
      fontFamily: 'var(--font-sans)',
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      borderRadius: 999,
      padding: '4px 11px',
      lineHeight: 1,
      background: kind === 'before' ? 'var(--navy)' : 'var(--amber)',
      color: '#fff'
    }
  }, kind === 'before' ? 'Before' : 'After'), !src && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 10,
      bottom: 8,
      fontFamily: 'var(--font-serif)',
      fontStyle: 'normal',
      color: kind === 'before' ? 'rgba(255,255,255,.45)' : 'rgba(13,37,77,.35)',
      fontSize: 10
    }
  }, kind === 'before' ? 'dim · cluttered' : 'bright · turnkey'));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: orientation === 'vertical' ? 'column' : 'row',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Photo, {
    kind: "before",
    src: before
  }), orientation === 'vertical' && /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--navy)",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      background: '#fff',
      borderRadius: 999,
      padding: 4,
      boxSizing: 'content-box',
      border: '1px solid var(--stone)'
    }
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "19 12 12 19 5 12"
  })), /*#__PURE__*/React.createElement(Photo, {
    kind: "after",
    src: after
  }));
}

// ---------- Feature row: icon disc + label + line ----------
function IconDisc({
  children,
  amber = false,
  size = 52
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: 999,
      background: amber ? 'var(--amber)' : 'var(--stone)',
      color: amber ? '#fff' : 'var(--navy)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, children);
}

// Small inline-SVG icon library — thin line, Lucide-derived.
// Pass `name` for known ones; pass `<Icon>` children for custom.
const ICONS = {
  team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  swatch: 'M19 11h2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3 M19 11V5a2 2 0 0 0-2-2h-2 M15 3H7a2 2 0 0 0-2 2v11 M9 21l4-4 M5 16l8 8',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z',
  dollar: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  truck: 'M1 3h15v13H1z M16 8h4l3 3v5h-7z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  paint: 'M19 11h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h0',
  award: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  chart: 'M3 3v18h18 M7 15l4-4 4 4 5-5',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87',
  briefcase: 'M2 7h20v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2',
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  building: 'M3 21h18 M5 21V7l8-4v18 M19 21V11l-6-4 M9 9v.01 M9 12v.01 M9 15v.01 M9 18v.01',
  star: 'M12 2l3 7 7 .5L17 14.5 18.5 22 12 18l-6.5 4L7 14.5 2 9.5 9 9z'
};
function Icon({
  name,
  size = 26,
  color = 'currentColor',
  strokeWidth = 1.75,
  style
}) {
  const d = ICONS[name];
  if (!d) return null;
  // Some path strings have multiple subpaths separated by " M " — render as one path
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, d.split(/\s(?=M)/).map((seg, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: seg
  })));
}
function FeatureRow({
  icon,
  iconName,
  label,
  children,
  amber = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      ...style
    }
  }, /*#__PURE__*/React.createElement(IconDisc, {
    amber: amber
  }, icon || /*#__PURE__*/React.createElement(Icon, {
    name: iconName,
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 4
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12.5,
      lineHeight: 1.45,
      color: 'var(--fg-muted)'
    }
  }, children)));
}

// ---------- QR Disc ----------
function QRDisc({
  size = 88
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: 999,
      background: 'var(--amber)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size * 0.62,
    height: size * 0.62,
    viewBox: "0 0 64 64",
    style: {
      background: '#F7F7F7',
      borderRadius: 4,
      padding: 4,
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("g", {
    fill: "#0D254D"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "14",
    height: "14"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "4",
    width: "10",
    height: "10",
    fill: "#F7F7F7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "6",
    width: "6",
    height: "6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "48",
    y: "2",
    width: "14",
    height: "14"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "50",
    y: "4",
    width: "10",
    height: "10",
    fill: "#F7F7F7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "52",
    y: "6",
    width: "6",
    height: "6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "48",
    width: "14",
    height: "14"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "50",
    width: "10",
    height: "10",
    fill: "#F7F7F7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "52",
    width: "6",
    height: "6"
  }), [[22, 4], [26, 4], [30, 8], [34, 4], [38, 8], [42, 4], [22, 10], [28, 12], [32, 10], [40, 12], [4, 22], [8, 26], [12, 22], [16, 28], [22, 22], [26, 24], [30, 22], [34, 26], [38, 22], [42, 24], [46, 22], [50, 26], [54, 22], [58, 26], [4, 32], [10, 34], [14, 30], [18, 34], [24, 30], [28, 34], [32, 30], [36, 34], [40, 30], [46, 34], [52, 30], [56, 34], [4, 42], [8, 46], [14, 42], [22, 42], [26, 44], [30, 42], [34, 46], [38, 42], [42, 44], [48, 42], [54, 44], [58, 42], [22, 52], [28, 54], [34, 52], [42, 54], [48, 52], [54, 54], [60, 52]].map(([x, y], i) => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: x,
    y: y,
    width: "3",
    height: "3"
  })))));
}

// ---------- Comparison table ----------
function ComparisonTable({
  rows = [],
  traditionalLabel = 'Traditional Home Improvement'
}) {
  return /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--font-sans)',
      fontSize: 11.5,
      borderRadius: 6,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      background: 'var(--navy)',
      color: '#fff',
      padding: '8px 10px',
      textAlign: 'left',
      fontSize: 9,
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }), /*#__PURE__*/React.createElement("th", {
    style: {
      background: 'var(--navy)',
      color: '#fff',
      padding: '8px 10px',
      textAlign: 'left',
      fontSize: 9,
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, traditionalLabel), /*#__PURE__*/React.createElement("th", {
    style: {
      background: 'var(--amber)',
      color: '#fff',
      padding: '8px 10px',
      textAlign: 'left',
      fontSize: 9,
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, "curbio"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      background: i % 2 === 0 ? '#fff' : 'var(--cloud-white)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '8px 10px',
      borderTop: '1px solid var(--stone)',
      fontWeight: 700,
      color: 'var(--navy)',
      whiteSpace: 'nowrap'
    }
  }, r.label), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '8px 10px',
      borderTop: '1px solid var(--stone)',
      color: 'var(--fg-muted)'
    }
  }, r.traditional), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '8px 10px',
      borderTop: '1px solid var(--stone)',
      color: 'var(--navy)',
      fontWeight: 600
    }
  }, r.curbio)))));
}

// ---------- Navy CTA footer block (used at the closing panel of every brochure) ----------
function NavyCloser({
  headline,
  sub,
  ctaLabel = 'Ready to get started?',
  ctaSub,
  showQR = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--navy)',
      color: '#fff',
      borderRadius: 8,
      padding: '18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SerifH, {
    size: 22,
    color: "#fff",
    style: {
      marginBottom: 8
    }
  }, headline), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11.5,
      lineHeight: 1.5,
      color: '#C7CFDB'
    }
  }, sub)), showQR && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(QRDisc, {
    size: 64
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11.5,
      fontWeight: 800,
      color: '#fff',
      marginBottom: 3,
      lineHeight: 1.3
    }
  }, ctaLabel), ctaSub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 10.5,
      color: '#C7CFDB',
      lineHeight: 1.4
    }
  }, ctaSub))));
}

// ---------- Bottom brand bar ----------
function NavyBrandBar() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--navy)',
      color: '#fff',
      padding: '16px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    variant: "white",
    height: 26
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 10,
      fontWeight: 600,
      color: '#C7CFDB',
      textAlign: 'right',
      lineHeight: 1.25,
      maxWidth: 120
    }
  }, "The pre-listing", /*#__PURE__*/React.createElement("br", null), "home improvement experts."));
}
Object.assign(__ds_scope, { Wordmark, HouseMark, Eyebrow, AmberRule, SerifH, PullQuote, StarRow, PillButton, BeforeAfter, IconDisc, Icon, FeatureRow, QRDisc, ComparisonTable, NavyCloser, NavyBrandBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/brochures/primitives.jsx", error: String((e && e.message) || e) }); }

// ui_kits/brochures/AgentBrochure.jsx
try { (() => {
// Agent brochure (the "why present Curbio on every listing" tri-fold).
// Recreates the canonical layout in assets/brochure-reference.jpg.

function AgentBrochure() {
  return /*#__PURE__*/React.createElement(__ds_scope.Brochure, {
    label: "Agent brochure \u2014 for real estate professionals"
  }, /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    noPadding: true,
    bg: "#fff",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 340,
      background: 'linear-gradient(180deg, #f5ede0 0%, #d8c7ad 60%, #b59a76 100%)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 22,
      top: 22
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    variant: "navy",
    height: 26
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 18,
      bottom: 14,
      fontFamily: 'var(--font-serif)',
      fontStyle: 'normal',
      color: 'rgba(13,37,77,0.35)',
      fontSize: 11
    }
  }, "kitchen \xB7 natural light")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 22px 14px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 32
  }, "Get your home", /*#__PURE__*/React.createElement("br", null), "market-ready \u2014", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "without"), " managing", /*#__PURE__*/React.createElement("br", null), "the work yourself."), /*#__PURE__*/React.createElement(__ds_scope.AmberRule, {
    width: 48,
    style: {
      margin: '16px 0 12px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      lineHeight: 1.5,
      color: 'var(--fg-muted)'
    }
  }, "Pre-listing updates, repairs, and refreshes coordinated from start to finish by Curbio."), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--cloud-white)',
      border: '1px solid var(--stone)',
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.HouseMark, {
    variant: "amber",
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11.5,
      color: 'var(--navy)',
      lineHeight: 1.4
    }
  }, "Ask your agent about a", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", null, "free Curbio estimate."))))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    bg: "var(--cloud-white)"
  }, /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 28,
    style: {
      marginBottom: 12
    }
  }, "Today's buyers want ", /*#__PURE__*/React.createElement("em", null, "move-in ready"), " homes."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12.5,
      lineHeight: 1.5,
      color: 'var(--fg-muted)',
      marginBottom: 16
    }
  }, "Small updates can make a big difference in how your home shows, photographs, and sells \u2014 and can lead to stronger offers and a smoother sale."), /*#__PURE__*/React.createElement(__ds_scope.BeforeAfter, null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--stone)',
      borderRadius: 8,
      padding: '14px 16px',
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 16,
    style: {
      marginBottom: 4
    }
  }, "Invest today.", /*#__PURE__*/React.createElement("br", null), "Earn more tomorrow."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      color: 'var(--fg-muted)',
      lineHeight: 1.4
    }
  }, "Homes updated by Curbio sell faster and for more.", /*#__PURE__*/React.createElement("sup", null, "*")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 9,
      color: 'var(--fg-subtle)',
      marginTop: 8
    }
  }, "*Source: Curbio data"))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    bg: "#fff"
  }, /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 26,
    style: {
      marginBottom: 16
    }
  }, "One team.", /*#__PURE__*/React.createElement("br", null), "One timeline.", /*#__PURE__*/React.createElement("br", null), "One ", /*#__PURE__*/React.createElement("em", null, "accountable"), /*#__PURE__*/React.createElement("br", null), "partner."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      lineHeight: 1.5,
      color: 'var(--fg-muted)',
      marginBottom: 18
    }
  }, "We bring everything together so you don't have to \u2014 making the process simple, clear, and stress-free."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.FeatureRow, {
    iconName: "team",
    label: "Dedicated Project Management"
  }, "Your local Curbio project manager oversees every detail."), /*#__PURE__*/React.createElement(__ds_scope.FeatureRow, {
    iconName: "shield",
    label: "Licensed, Insured Professionals"
  }, "Trusted local pros who take pride in their work."), /*#__PURE__*/React.createElement(__ds_scope.FeatureRow, {
    iconName: "swatch",
    label: "Buyer-Friendly Finishes"
  }, "Curated materials and updates that today's buyers love."), /*#__PURE__*/React.createElement(__ds_scope.FeatureRow, {
    iconName: "phone",
    label: "Consistent Updates"
  }, "Real-time communication so you always know what's happening."), /*#__PURE__*/React.createElement(__ds_scope.FeatureRow, {
    iconName: "dollar",
    label: "Flexible Payment Options"
  }, "Solutions available for qualified sellers."))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    noPadding: true,
    bg: "#fff",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 240,
      background: 'linear-gradient(180deg, #ece2d2 0%, #c9b598 60%, #9c8568 100%)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 16,
      bottom: 12,
      fontFamily: 'var(--font-serif)',
      fontStyle: 'normal',
      color: 'rgba(13,37,77,0.3)',
      fontSize: 11
    }
  }, "after \xB7 staged living room")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 22,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--cloud-white)',
      padding: '8px 10px',
      borderRadius: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PullQuote, {
    cite: "Aaron G.",
    stars: 5
  }, "Curbio made the whole process simple and stress-free. They handled everything, kept us updated, and our home looked amazing on listing day.")), /*#__PURE__*/React.createElement(__ds_scope.NavyCloser, {
    headline: /*#__PURE__*/React.createElement(React.Fragment, null, "List with confidence.", /*#__PURE__*/React.createElement("br", null), "We'll take care of the rest."),
    ctaLabel: "Ready to get started?",
    ctaSub: "Ask your agent about a free Curbio estimate or scan the QR code to learn more."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.NavyBrandBar, null))));
}
Object.assign(__ds_scope, { AgentBrochure });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/brochures/AgentBrochure.jsx", error: String((e && e.message) || e) }); }

// ui_kits/brochures/BrokerageBrochure.jsx
try { (() => {
// Brokerage brochure — the most strategic of the three.
// Positions Curbio Concierge as a recruit-and-retain offering.
// Cover lockup: [Brokerage logo] | curbio (or "powered by curbio" white-label).

function BrokerageBrochure() {
  const compareRows = [{
    label: 'Estimates',
    traditional: 'Takes weeks',
    curbio: 'Free, fast estimates'
  }, {
    label: 'Materials',
    traditional: 'Agents source themselves',
    curbio: 'Curated, ready to install'
  }, {
    label: 'Management',
    traditional: 'Agents juggle subs',
    curbio: 'One Curbio PM, end-to-end'
  }, {
    label: 'Updates',
    traditional: 'Unclear timelines',
    curbio: 'Real-time, in-app'
  }];
  return /*#__PURE__*/React.createElement(__ds_scope.Brochure, {
    label: "Brokerage brochure \u2014 for teams and broker-owners"
  }, /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    noPadding: true,
    bg: "var(--navy)",
    style: {
      color: '#fff',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 22px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: '#fff'
    }
  }, "[Brokerage]"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 16,
      background: 'rgba(255,255,255,0.3)'
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    variant: "white",
    height: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 22px 16px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    amber: true,
    style: {
      marginBottom: 14
    }
  }, "Concierge program"), /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 32,
    color: "#fff"
  }, "A full-service", /*#__PURE__*/React.createElement("br", null), "pre-listing solution,", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "powered by curbio.")), /*#__PURE__*/React.createElement(__ds_scope.AmberRule, {
    width: 48,
    style: {
      margin: '16px 0 12px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12.5,
      lineHeight: 1.55,
      color: '#C7CFDB'
    }
  }, "Help your agents win more listings, raise productivity, and compete head-on with full-service brokerages \u2014 available as Curbio or white-labeled under your brand.")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: 'linear-gradient(180deg, #1A335E 0%, #0D254D 100%)',
      padding: '0 22px 22px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 8
    }
  }, [['5,000+', 'projects'], ['1 yr', 'warranty'], ['Top US', 'markets']].map(([big, lbl]) => /*#__PURE__*/React.createElement("div", {
    key: big,
    style: {
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 8,
      padding: '10px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 22,
      color: 'var(--amber)',
      lineHeight: 1,
      fontWeight: 600
    }
  }, big), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 9.5,
      color: '#C7CFDB',
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontWeight: 700
    }
  }, lbl)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--amber)',
      borderRadius: 6,
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "building",
    size: 20,
    color: "#fff"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11.5,
      fontWeight: 700,
      color: '#fff',
      lineHeight: 1.3
    }
  }, "Available white-labeled", /*#__PURE__*/React.createElement("br", null), "under your brokerage brand.")))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    bg: "var(--cloud-white)"
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    style: {
      marginBottom: 12
    }
  }, "Why broker-owners adopt Concierge"), /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 26,
    style: {
      marginBottom: 14
    }
  }, "Recruit, retain,", /*#__PURE__*/React.createElement("br", null), "and ", /*#__PURE__*/React.createElement("em", null, "compete"), " harder."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.FeatureRow, {
    iconName: "award",
    label: "Recruit & Retain Top Agents"
  }, "Concierge is a competitive differentiator agents want."), /*#__PURE__*/React.createElement(__ds_scope.FeatureRow, {
    iconName: "chart",
    label: "Grow Listing Market Share"
  }, "Help agents convert more listing appointments and reduce time on market."), /*#__PURE__*/React.createElement(__ds_scope.FeatureRow, {
    iconName: "briefcase",
    label: "Compete With Full-Service"
  }, "Match the offering of national full-service brokerages."), /*#__PURE__*/React.createElement(__ds_scope.FeatureRow, {
    iconName: "users",
    label: "Train-the-Trainers Support"
  }, "Brokerage leadership and office managers get a dedicated Curbio account team.")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderLeft: '3px solid var(--amber)',
      padding: '12px 14px',
      marginTop: 18,
      borderRadius: '0 6px 6px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontStyle: 'normal',
      fontSize: 13.5,
      color: 'var(--navy)',
      lineHeight: 1.5
    }
  }, "Our team is here to help drive agent adoption \u2014 from launch to ongoing account management."))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    bg: "#fff"
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    style: {
      marginBottom: 10
    }
  }, "The new way"), /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 22,
    style: {
      marginBottom: 14
    }
  }, "Goodbye, traditional", /*#__PURE__*/React.createElement("br", null), "home improvement."), /*#__PURE__*/React.createElement(__ds_scope.ComparisonTable, {
    rows: compareRows
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    style: {
      marginBottom: 10
    }
  }, "What partners receive"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, [['Messaging guide', 'message'], ['Listing presentation', 'briefcase'], ['Email library', 'message'], ['Social templates', 'star'], ['Agent toolkit', 'key'], ['Project photos', 'home']].map(([t, ic]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      background: 'var(--cloud-white)',
      border: '1px solid var(--stone)',
      borderRadius: 6,
      padding: '8px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: ic,
    size: 16,
    color: "var(--amber)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--navy)'
    }
  }, t)))))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    noPadding: true,
    bg: "#fff",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 220,
      background: 'linear-gradient(180deg, #e9d9bd 0%, #c4a472 60%, #8d6e3f 100%)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 16,
      bottom: 12,
      fontFamily: 'var(--font-serif)',
      fontStyle: 'normal',
      color: 'rgba(13,37,77,0.3)',
      fontSize: 11
    }
  }, "brokerage office \xB7 welcoming")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 22,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--cloud-white)',
      padding: '8px 10px',
      borderRadius: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PullQuote, {
    cite: "Jennifer M., CMO partner",
    stars: 5
  }, "Curbio gave our agents a competitive listing advantage from day one. The team operates like an extension of our brokerage.")), /*#__PURE__*/React.createElement(__ds_scope.NavyCloser, {
    headline: /*#__PURE__*/React.createElement(React.Fragment, null, "Launch your", /*#__PURE__*/React.createElement("br", null), "Concierge program."),
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, "Our partnership team will guide you through every step \u2014 marketing, training, and white-label setup."),
    ctaLabel: "Schedule a partnership call",
    ctaSub: "Or scan to download the full Quick Start Guide."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.NavyBrandBar, null))));
}
Object.assign(__ds_scope, { BrokerageBrochure });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/brochures/BrokerageBrochure.jsx", error: String((e && e.message) || e) }); }

// ui_kits/brochures/HomeownerBrochure.jsx
try { (() => {
// Homeowner brochure — the warmest, simplest version.
// Tone: "Update before you list — without managing the work yourself."
// Co-brand: [Agent Logo] | curbio.

function HomeownerBrochure() {
  return /*#__PURE__*/React.createElement(__ds_scope.Brochure, {
    label: "Homeowner brochure \u2014 for the listing package"
  }, /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    noPadding: true,
    bg: "#fff",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 380,
      background: 'linear-gradient(180deg, #faeed7 0%, #e8cea2 50%, #c69d63 100%)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 20,
      left: 22,
      right: 22,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: 'var(--navy)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase'
    }
  }, "[Your Logo]"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 18,
      background: 'rgba(13,37,77,0.3)'
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    variant: "navy",
    height: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 18,
      bottom: 12,
      fontFamily: 'var(--font-serif)',
      fontStyle: 'normal',
      color: 'rgba(13,37,77,0.35)',
      fontSize: 11
    }
  }, "welcoming foyer")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 22px 18px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    amber: true,
    style: {
      marginBottom: 12
    }
  }, "For the home seller"), /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 30
  }, "Update before", /*#__PURE__*/React.createElement("br", null), "you list. Sell for", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "more"), ", faster."), /*#__PURE__*/React.createElement(__ds_scope.AmberRule, {
    width: 48,
    style: {
      margin: '14px 0 12px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12.5,
      lineHeight: 1.5,
      color: 'var(--fg-muted)'
    }
  }, "Your agent recommends Curbio because they trust us to get the work done right \u2014 on time, on budget, and without the stress of managing it yourself."), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--amber-10, #FAF1E3)',
      border: '1px solid #F0DAB8',
      borderRadius: 8,
      padding: '12px 14px',
      marginTop: 18,
      fontFamily: 'var(--font-sans)',
      fontSize: 11.5,
      color: 'var(--navy)',
      lineHeight: 1.45
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      marginBottom: 2
    }
  }, "Pay-at-closing option"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--fg-muted)'
    }
  }, "Qualified sellers can pay nothing upfront.")))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    bg: "var(--cloud-white)"
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    style: {
      marginBottom: 10
    }
  }, "Why update before you list"), /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 24,
    style: {
      marginBottom: 12
    }
  }, "Today's buyers want ", /*#__PURE__*/React.createElement("em", null, "move-in ready"), "."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12.5,
      lineHeight: 1.55,
      color: 'var(--fg-muted)',
      marginBottom: 18
    }
  }, "A few targeted updates \u2014 paint, flooring, kitchen and bath refreshes \u2014 make your home photograph better, show better, and ultimately sell for more."), /*#__PURE__*/React.createElement(__ds_scope.BeforeAfter, null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--stone)',
      borderRadius: 8,
      padding: 14,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    style: {
      marginBottom: 6
    }
  }, "The numbers"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 28,
      color: 'var(--amber)',
      lineHeight: 1,
      fontWeight: 600
    }
  }, "5,000+"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 10.5,
      color: 'var(--fg-muted)',
      marginTop: 3,
      lineHeight: 1.3
    }
  }, "projects completed")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 28,
      color: 'var(--amber)',
      lineHeight: 1,
      fontWeight: 600
    }
  }, "1-yr"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 10.5,
      color: 'var(--fg-muted)',
      marginTop: 3,
      lineHeight: 1.3
    }
  }, "limited warranty"))))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    bg: "#fff"
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    style: {
      marginBottom: 10
    }
  }, "How it works"), /*#__PURE__*/React.createElement(__ds_scope.SerifH, {
    size: 24,
    style: {
      marginBottom: 16
    }
  }, "Four simple steps,", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "from start to finish.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, [['01', 'Tell us the work needed', 'Get a free estimate by phone, online, or in the Curbio app.'], ['02', 'Finalize the project plan', 'Your dedicated, local Curbio project manager scopes the work.'], ['03', 'Curbio gets to work', 'We coordinate every trade, every material, every detail.'], ['04', 'List with confidence', 'A one-year limited warranty on all completed work.']].map(([n, title, body]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 999,
      border: '1.5px solid var(--amber)',
      color: 'var(--amber)',
      fontFamily: 'var(--font-serif)',
      fontWeight: 600,
      fontSize: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 800,
      color: 'var(--navy)',
      fontSize: 13,
      marginBottom: 3
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--fg-muted)',
      lineHeight: 1.45
    }
  }, body)))))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    noPadding: true,
    bg: "#fff",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 220,
      background: 'linear-gradient(180deg, #f4e8d4 0%, #ddc59a 60%, #b59565 100%)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 16,
      bottom: 12,
      fontFamily: 'var(--font-serif)',
      fontStyle: 'normal',
      color: 'rgba(13,37,77,0.3)',
      fontSize: 11
    }
  }, "after \xB7 bright kitchen")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 22,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PullQuote, {
    cite: "Maria L., home seller",
    stars: 5
  }, "We were dreading the work. Curbio handled everything and our home sold above asking on the first weekend."), /*#__PURE__*/React.createElement(__ds_scope.NavyCloser, {
    headline: /*#__PURE__*/React.createElement(React.Fragment, null, "Your agent has the", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "full picture.")),
    sub: /*#__PURE__*/React.createElement(React.Fragment, null, "Talk to your agent about whether a Curbio refresh is right for your home \u2014 they'll know what buyers in your market want."),
    ctaLabel: "Talk to your agent",
    ctaSub: "Or scan to learn more about Curbio."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.NavyBrandBar, null))));
}
Object.assign(__ds_scope, { HomeownerBrochure });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/brochures/HomeownerBrochure.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AgentBrochure = __ds_scope.AgentBrochure;

__ds_ns.PANEL_W = __ds_scope.PANEL_W;

__ds_ns.PANEL_H = __ds_scope.PANEL_H;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.Brochure = __ds_scope.Brochure;

__ds_ns.BrokerageBrochure = __ds_scope.BrokerageBrochure;

__ds_ns.HomeownerBrochure = __ds_scope.HomeownerBrochure;

__ds_ns.Wordmark = __ds_scope.Wordmark;

__ds_ns.HouseMark = __ds_scope.HouseMark;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.AmberRule = __ds_scope.AmberRule;

__ds_ns.SerifH = __ds_scope.SerifH;

__ds_ns.PullQuote = __ds_scope.PullQuote;

__ds_ns.StarRow = __ds_scope.StarRow;

__ds_ns.PillButton = __ds_scope.PillButton;

__ds_ns.BeforeAfter = __ds_scope.BeforeAfter;

__ds_ns.IconDisc = __ds_scope.IconDisc;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.FeatureRow = __ds_scope.FeatureRow;

__ds_ns.QRDisc = __ds_scope.QRDisc;

__ds_ns.ComparisonTable = __ds_scope.ComparisonTable;

__ds_ns.NavyCloser = __ds_scope.NavyCloser;

__ds_ns.NavyBrandBar = __ds_scope.NavyBrandBar;

})();
