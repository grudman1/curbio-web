// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI — paper pieces on one transparent canvas, about three and a half seconds long.
//
// Written here rather than pulled from a library: the people reading this page
// are on a phone on conference Wi-Fi, this is about 5 KB (about 2 KB compressed), it is fetched only after
// the page is interactive, and it adds nothing to package.json (a shared file,
// and a dependency to keep patched for a page that lives one week).
//
// What it promises, and where each promise is kept:
//
//   never takes a tap or focus   the canvas is pointer-events:none and
//                                aria-hidden, and is taken OUT of the page when
//                                the last piece is gone — it is never left
//                                sitting over the form
//   gone in about 3.5 seconds    every piece has an end time on the WALL clock,
//                                not a frame count, so a slow phone fades them
//                                out on schedule instead of running long; a
//                                timer removes the canvas regardless
//   light on a mid-range phone   half the pieces under 640px, one canvas, a
//                                device-pixel ratio capped at 2, nothing drawn
//                                while the tab is hidden
//   nothing at all if asked      prefers-reduced-motion skips it entirely
//   brand colours only           read from the site's own tokens (amber, navy,
//                                teal, sage, white), with the same hex as a
//                                fallback if a token is ever renamed
//
// Two entry points: `fireWelcome()` when the page opens, and `fireThanks()` —
// a smaller pop from the check mark — on "You're in!".
// ─────────────────────────────────────────────────────────────────────────────

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vrot: number;
  /** The piece turning over in the air: its height is squashed by |cos(tilt)|. */
  tilt: number;
  vtilt: number;
  /** Side-to-side flutter. */
  wob: number;
  vwob: number;
  wobAmp: number;
  color: string;
  /** White and pale sage disappear on a light page without a hairline. */
  outlined: boolean;
  round: boolean;
  /** When it appears and when it is gone, ms after its burst began. */
  start: number;
  end: number;
  /** When this piece's burst began (performance.now()). */
  born: number;
};

type Burst = {
  x: number;
  y: number;
  /** Start each piece at a random point in this box (viewport px) instead of at
   *  x, y — how a curtain of confetti is made out of one burst. */
  area?: { x0: number; x1: number; y0: number; y1: number };
  /** Piece size multiplier. */
  scale?: number;
  /** Direction in radians on the canvas: 0 is right, −π/2 is straight up. */
  angle: number;
  spread: number;
  count: number;
  /** Launch speed, px/s. */
  speed: [number, number];
  /** Delay before each piece appears, ms. */
  delay: [number, number];
  /** How long each piece lives, ms from the burst's start (fade included). */
  life: [number, number];
};

const GRAVITY = 900; // px/s², down
const DRAG = 2.2; // 1/s — with gravity, a terminal fall of ~400 px/s: paper, not stones
const FADE_MS = 650;
/** Nothing outlives this, whatever the frame rate did. */
const HARD_STOP_MS = 3900;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let pieces: Piece[] = [];
let raf = 0;
let last = 0;
let stopTimer: number | undefined;
let dpr = 1;
/** The hairline round the pale pieces — the navy token, read once per burst. */
let outline = "#0d254d";

function calm(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const isPhone = () => window.innerWidth < 640;

function palette(): { color: string; outlined: boolean }[] {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const amber = token("--amber", "#cd8629");
  const navy = token("--navy", "#0d254d");
  const teal = token("--teal", "#176c67");
  const sage = token("--sage-110", "#c9d6ce");
  const white = token("--white", "#ffffff");
  outline = navy;
  // Amber is the brand's accent, so it carries the most pieces.
  return [
    { color: amber, outlined: false },
    { color: amber, outlined: false },
    { color: amber, outlined: false },
    { color: navy, outlined: false },
    { color: navy, outlined: false },
    { color: teal, outlined: false },
    { color: teal, outlined: false },
    { color: sage, outlined: true },
    { color: white, outlined: true },
  ];
}

function canvasContext(): CanvasRenderingContext2D | null {
  if (canvas && ctx) return ctx;
  const el = document.createElement("canvas");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("data-gw-confetti", "");
  const s = el.style;
  s.position = "fixed";
  s.top = "0";
  s.left = "0";
  s.width = "100%";
  s.height = "100%";
  s.pointerEvents = "none";
  // Above the sticky header (40), below the cookie notice.
  s.zIndex = "60";
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.width = Math.round(window.innerWidth * dpr);
  el.height = Math.round(window.innerHeight * dpr);
  const context = el.getContext("2d");
  if (!context) return null;
  document.body.appendChild(el);
  canvas = el;
  ctx = context;
  return context;
}

function stop(): void {
  cancelAnimationFrame(raf);
  raf = 0;
  window.clearTimeout(stopTimer);
  stopTimer = undefined;
  pieces = [];
  canvas?.remove();
  canvas = null;
  ctx = null;
}

function spawn(b: Burst): void {
  const colors = palette();
  const born = performance.now();
  // Designed for a desktop hero; a phone's is a third the area, so smaller.
  const k = (b.scale ?? 1) * (isPhone() ? 0.8 : 1);
  const rand = (a: number, z: number) => a + Math.random() * (z - a);
  for (let i = 0; i < b.count; i++) {
    const angle = b.angle + (Math.random() - 0.5) * b.spread;
    const speed = b.speed[0] + Math.random() * (b.speed[1] - b.speed[0]);
    const shape = Math.random();
    const ribbon = shape < 0.18;
    const round = shape > 0.85;
    const pick = colors[(Math.random() * colors.length) | 0];
    // Big enough to read across a room: 12–22px squares, 10–17px dots, thin
    // 30–52px streamers.
    const w = k * (ribbon ? rand(6, 9) : round ? rand(10, 17) : rand(12, 22));
    const start = b.delay[0] + Math.random() * (b.delay[1] - b.delay[0]);
    pieces.push({
      x: b.area ? rand(b.area.x0, b.area.x1) : b.x,
      y: b.area ? rand(b.area.y0, b.area.y1) : b.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w,
      h: ribbon ? k * rand(30, 52) : round ? w : k * rand(16, 28),
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 14,
      tilt: Math.random() * Math.PI * 2,
      vtilt: 6 + Math.random() * 8,
      wob: Math.random() * Math.PI * 2,
      vwob: 4 + Math.random() * 4,
      wobAmp: 18 + Math.random() * 26,
      color: pick.color,
      outlined: pick.outlined,
      round,
      start,
      end: Math.max(start + 900, b.life[0] + Math.random() * (b.life[1] - b.life[0])),
      born,
    });
  }
}

function frame(now: number): void {
  const context = ctx;
  if (!context || !canvas) return;
  // Physics steps are capped so a stalled frame cannot fling pieces across the
  // screen; the fade below is read off the clock, so it still finishes on time.
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const live: Piece[] = [];
  for (const p of pieces) {
    const t = now - p.born;
    if (t >= p.end) continue;
    live.push(p);
    if (t < p.start) continue;

    p.vx -= p.vx * DRAG * dt;
    p.vy += (GRAVITY - p.vy * DRAG) * dt;
    p.x += (p.vx + Math.sin(p.wob) * p.wobAmp) * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    p.tilt += p.vtilt * dt;
    p.wob += p.vwob * dt;

    const alpha = t > p.end - FADE_MS ? Math.max(0, (p.end - t) / FADE_MS) : 1;
    context.save();
    context.globalAlpha = alpha;
    context.translate(p.x, p.y);
    context.rotate(p.rot);
    context.scale(1, p.round ? 1 : Math.max(0.15, Math.abs(Math.cos(p.tilt))));
    context.fillStyle = p.color;
    if (p.round) {
      context.beginPath();
      context.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    if (p.outlined) {
      context.globalAlpha = alpha * 0.35;
      context.lineWidth = 1;
      context.strokeStyle = outline;
      if (p.round) context.stroke();
      else context.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    context.restore();
  }
  pieces = live;

  if (pieces.length > 0) raf = requestAnimationFrame(frame);
  else stop();
}

function launch(bursts: Burst[]): void {
  try {
    if (!canvasContext()) return;
    for (const b of bursts) spawn(b);
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    window.clearTimeout(stopTimer);
    stopTimer = window.setTimeout(stop, HARD_STOP_MS);
  } catch {
    // Confetti is decoration. Whatever went wrong, the page is unaffected.
    stop();
  }
}

/** Run `fn` now, or — if the tab is in the background — the moment it is seen,
 *  so the pop is not spent on a page nobody is looking at. */
function whenVisible(fn: () => void): void {
  if (!document.hidden) {
    fn();
    return;
  }
  const onShow = () => {
    if (document.hidden) return;
    document.removeEventListener("visibilitychange", onShow);
    fn();
  };
  document.addEventListener("visibilitychange", onShow);
}

/**
 * The opening burst, built like a poster rather than a few poppers: a CURTAIN
 * across the whole width of the screen so no part of the hero is bare, a big
 * radial burst from behind the headline and another from the form so the right
 * column is covered too, and a popper at each side as an accent. Everything
 * rises or falls through the hero, turns over, and is gone in about 3.5 s.
 */
export function fireWelcome(): void {
  if (calm()) return;
  whenVisible(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const phone = isPhone();
    const centre = (selector: string, fallback: { x: number; y: number }) => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      return r && r.width > 0 ? { x: r.left + r.width / 2, y: Math.min(h * 0.6, Math.max(60, r.top + r.height / 2)) } : fallback;
    };
    const headline = centre("h1", { x: w * 0.3, y: h * 0.3 });
    const card = centre("#enter", { x: w * 0.75, y: h * 0.35 });
    const reach = Math.max(420, w * 0.45);
    const v = reach * DRAG;
    const bursts: Burst[] = [
      {
        // The curtain: starts above the screen across its whole width, with
        // some sideways drift, entering over the first second.
        x: 0,
        y: 0,
        area: { x0: -30, x1: w + 30, y0: -320, y1: -20 },
        angle: Math.PI / 2,
        spread: 0.9,
        count: phone ? 100 : 230,
        speed: [250, 750],
        delay: [0, 1000],
        life: [2900, 3500],
      },
      {
        // From behind the headline, in every direction.
        x: headline.x,
        y: headline.y,
        angle: -Math.PI / 2,
        spread: Math.PI * 2,
        count: phone ? 60 : 100,
        speed: [v * 0.35, v * 1.0],
        delay: [0, 140],
        life: [2800, 3500],
        scale: 1.1,
      },
      {
        // From the form's top edge, so the right-hand column is not left out.
        x: card.x,
        y: card.y,
        angle: -Math.PI / 2,
        spread: Math.PI * 2,
        count: phone ? 0 : 80,
        speed: [v * 0.3, v * 0.9],
        delay: [180, 360],
        life: [2800, 3500],
        scale: 1.1,
      },
      {
        x: -6,
        y: h * 0.75,
        angle: (-50 * Math.PI) / 180,
        spread: 0.8,
        count: phone ? 24 : 50,
        speed: [v * 0.6, v * 1.1],
        delay: [0, 200],
        life: [2800, 3400],
        scale: 1.2,
      },
      {
        x: w + 6,
        y: h * 0.75,
        angle: (-130 * Math.PI) / 180,
        spread: 0.8,
        count: phone ? 24 : 50,
        speed: [v * 0.6, v * 1.1],
        delay: [0, 200],
        life: [2800, 3400],
        scale: 1.2,
      },
    ];
    launch(bursts.filter((b) => b.count > 0));
  });
}

/**
 * The small one, for "You're in!": a fan up from the check mark, with the same
 * larger pieces. `origin` is that element; with none, it pops from just above
 * the middle.
 */
export function fireThanks(origin: HTMLElement | null): void {
  if (calm()) return;
  whenVisible(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let x = w / 2;
    let y = h * 0.4;
    if (origin) {
      const r = origin.getBoundingClientRect();
      x = Math.min(w, Math.max(0, r.left + r.width / 2));
      y = Math.min(h, Math.max(0, r.top + r.height / 2));
    }
    launch([
      {
        x,
        y,
        angle: -Math.PI / 2,
        spread: 2.2,
        count: isPhone() ? 40 : 64,
        speed: [700, 1400],
        delay: [0, 120],
        life: [2000, 2600],
        scale: 1.15,
      },
    ]);
  });
}
