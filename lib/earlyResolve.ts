// ─────────────────────────────────────────────────────────────────────────────
// Start GET /api/resolve while the HTML is still parsing, instead of after the
// JS bundle has downloaded and hydrated.
//
// On "/" the hero is the skeleton until useMarketResolution gets an answer, so
// the headline (the LCP element) waited on: HTML → JS download → hydrate →
// /api/resolve round trip → render. The inline script below fires that last
// request during HTML parse, so it runs in parallel with the JS download. The
// hook then takes the in-flight promise instead of starting its own.
//
// SAME PARAM RULES AS THE HOOK — any ?market= means no fetch at all, and only
// zip / code / status are forwarded. The promise is tagged with the exact
// query string it was made for; the hook only takes it on an exact match, and
// only once, so a client-side navigation (?zip= from the picker) always does a
// fresh fetch. A miss costs nothing: the hook fetches as it always did.
// ─────────────────────────────────────────────────────────────────────────────

type Early = { qs: string; p: Promise<unknown> };

declare global {
  interface Window {
    __curbioResolve?: Early;
  }
}

/** Inline, pre-hydration. ES5 on purpose — it runs before any polyfills. The
 *  trailing catch only silences an unhandled rejection if nothing ever takes
 *  the promise; the stored promise still rejects for the hook. */
export const EARLY_RESOLVE_SCRIPT = `(function(){try{var p=new URLSearchParams(location.search);if(p.get("market"))return;var q=new URLSearchParams();["zip","code","status"].forEach(function(k){var v=p.get(k);if(v)q.set(k,v)});var s=q.toString();var f=fetch("/api/resolve?"+s).then(function(r){return r.ok?r.json():null});f.catch(function(){});window.__curbioResolve={qs:s,p:f}}catch(e){}})();`;

/** The early request for exactly this query string, consumed once; else null. */
export function takeEarlyResolve(qs: string): Promise<unknown> | null {
  if (typeof window === "undefined") return null;
  const early = window.__curbioResolve;
  if (!early || early.qs !== qs) return null;
  delete window.__curbioResolve;
  return early.p;
}
