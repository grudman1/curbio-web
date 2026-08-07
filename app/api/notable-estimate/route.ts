import { NextResponse } from "next/server";

// Server-side proxy for Notable's partner estimator — the API behind the
// three-field widget on notablehome.com/curbio/apply.
//
// WHY A PROXY: api.notablefi.com CORS-allowlists Notable's own origins only,
// and Notable has blessed Curbio calling the estimator from our pages but
// will not make changes on their end (no allowlist entry). Browsers therefore
// can't call it directly from curbio.com — this route forwards server-to-
// server, where CORS doesn't apply.
//
// Endpoints mirrored 1:1, verified against Notable's own Framer
// LoanCalculator component (the widget on their page):
//   GET  /framer/curbio/estimator-options → { default_state, state_codes }
//        Live per-partner config. Not hardcodable: curbio's current list
//        already excludes WA, and it's Notable's to change.
//   POST /framer/curbio/estimator
//        { fico, estimated_sale_price, property_debt, state }
//        → { credit_limit_dollars, apr_bps } — both null = no offer, which
//        is a real outcome (denial view), not an error.
//
// NO PII crosses this route: three numbers and a state code. Nothing here
// touches /api/lead, Redis, or the CRM — display math, not a lead.

const NOTABLE_API = "https://api.notablefi.com/framer/curbio";

// The band floors Notable's own widget submits — the only fico values the
// upstream is ever sent, so the only ones we forward.
const FICO_BANDS = new Set([800, 760, 720, 680, 640, 300]);

export async function GET() {
  try {
    const res = await fetch(`${NOTABLE_API}/estimator-options`, {
      headers: { Accept: "application/json" },
      // Eligible-state config changes rarely; cache the upstream call.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    return NextResponse.json({
      default_state: typeof data.default_state === "string" ? data.default_state : null,
      state_codes: Array.isArray(data.state_codes) ? data.state_codes : [],
    });
  } catch (err) {
    console.error("[notable-estimate] options failed", err instanceof Error ? err.message : String(err));
    // The card falls back to its static all-states list — never blocking.
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const fico = Number(body.fico);
  const price = Number(body.estimated_sale_price);
  const debt = Number(body.property_debt);
  const state = typeof body.state === "string" ? body.state.toUpperCase() : "";

  // Strict enough that this can't relay arbitrary payloads at Notable; loose
  // enough to never block a real estimate. State stays a format check rather
  // than a hard list — the eligible list is Notable's config (GET above is
  // its source of truth), and they own validity.
  const valid =
    FICO_BANDS.has(fico) &&
    Number.isInteger(price) && price > 0 && price <= 100_000_000 &&
    Number.isInteger(debt) && debt >= 0 && debt <= 100_000_000 &&
    /^[A-Z]{2}$/.test(state);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid fields" }, { status: 400 });
  }

  try {
    const res = await fetch(`${NOTABLE_API}/estimator`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ fico, estimated_sale_price: price, property_debt: debt, state }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    // Explicit field pick — our response contract stays fixed even if the
    // upstream grows fields.
    return NextResponse.json({
      credit_limit_dollars:
        typeof data.credit_limit_dollars === "number" ? data.credit_limit_dollars : null,
      apr_bps: typeof data.apr_bps === "number" ? data.apr_bps : null,
    });
  } catch (err) {
    console.error("[notable-estimate] estimator failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: "Estimator unavailable" }, { status: 502 });
  }
}
