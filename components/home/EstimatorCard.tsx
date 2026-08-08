"use client";

import { useEffect, useState } from "react";
import { CreditSelect } from "./CreditSelect";

// The interactive half of "See what your seller qualifies for" — the first
// live-wired element on this page. Split out of QualifyCard.tsx so the client
// boundary is exactly one card wide; everything around it stays server-
// rendered.
//
// Mirrors Notable's own Framer widget (notablehome.com/curbio/apply): the
// same six credit bands (the API takes the band floor as `fico`), the same
// live options load (state list + default are per-partner config — curbio's
// current list excludes WA, so this is fetched, not hardcoded), and the same
// result math — monthly rate is apr_bps/12/100, APR is apr_bps/100. Every
// number comes from Notable through /api/notable-estimate; nothing is
// computed Curbio-side. Null limit + null APR is a real API outcome (no
// offer) and gets the denial view, not an error.
//
// NOT A LEAD FORM: three numbers and a state code cross the wire — no name,
// no contact, nothing touching /api/lead. The application itself stays on
// Notable's side (APPLY_URL).

const CREDIT_BANDS = [
  { label: "Exceptional (800+)", value: 800 },
  { label: "Excellent (760 – 799)", value: 760 },
  { label: "Very Good (720 – 759)", value: 720 },
  { label: "Good (680 – 719)", value: 680 },
  { label: "Fair (640 – 679)", value: 640 },
  { label: "Other (300 – 639)", value: 300 },
];

const APPLY_URL = "https://notablehome.com/curbio/apply";

// Fallback only — the live list from estimator-options replaces this on
// mount. 50 states + DC so any code Notable returns has a display name.
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington, D.C.",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const ALL_STATES = Object.keys(STATE_NAMES);

// Digits only, US-grouped ("700000" → "700,000"). Capped at 8 digits so the
// parsed value can never trip the proxy's 100M sanity bound.
function formatMoney(s: string): string {
  const d = s.replace(/\D/g, "").slice(0, 8);
  return d ? Number(d).toLocaleString("en-US") : "";
}

type EstimateResult = { limit: number | null; aprBps: number | null };

export function EstimatorCard() {
  const [band, setBand] = useState("");
  const [price, setPrice] = useState("");
  const [debt, setDebt] = useState("");
  // "AL" is Notable's configured default for the curbio partner today; the
  // options fetch below overrides it live.
  const [stateCode, setStateCode] = useState("AL");
  const [stateCodes, setStateCodes] = useState(ALL_STATES);
  const [stateOpen, setStateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notable-estimate")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        const codes: string[] =
          Array.isArray(d.state_codes) && d.state_codes.length ? d.state_codes : ALL_STATES;
        setStateCodes(codes);
        if (typeof d.default_state === "string" && codes.includes(d.default_state)) {
          setStateCode(d.default_state);
        } else if (!codes.includes("AL")) {
          setStateCode(codes[0]);
        }
      })
      .catch(() => {}); // static fallback list already in place
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = band !== "" && price !== "" && debt !== "" && stateCode !== "";

  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/notable-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fico: Number(band),
          estimated_sale_price: Number(price.replace(/\D/g, "")),
          property_debt: Number(debt.replace(/\D/g, "")),
          state: stateCode,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult({
        limit: typeof data.credit_limit_dollars === "number" ? data.credit_limit_dollars : null,
        aprBps: typeof data.apr_bps === "number" ? data.apr_bps : null,
      });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  // Back to the form with the fields kept — an agent tweaking scenarios
  // shouldn't have to retype the address-level numbers.
  function reset() {
    setResult(null);
    setFailed(false);
  }

  return (
    <div className="dpl2-card">
      <h3 className="dpl2-cardh">Estimate what they&rsquo;d qualify for</h3>
      {/* aria-live so the swap to results/denial is announced. */}
      <div aria-live="polite">
        {result === null ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="dpl2-field">
              <label className="dpl2-label" id="dpl2-credit-label" htmlFor="dpl2-credit">
                Seller&rsquo;s credit score
              </label>
              <CreditSelect
                bands={CREDIT_BANDS}
                value={band}
                onChange={setBand}
                id="dpl2-credit"
                labelledBy="dpl2-credit-label"
              />
            </div>
            <div className="dpl2-field">
              <label className="dpl2-label" htmlFor="dpl2-price">
                Estimated sale price
              </label>
              <input
                className="dpl2-input"
                id="dpl2-price"
                type="text"
                inputMode="numeric"
                placeholder="$ 700,000"
                value={price}
                onChange={(e) => setPrice(formatMoney(e.target.value))}
              />
            </div>
            <div className="dpl2-field">
              <label className="dpl2-label" htmlFor="dpl2-balance">
                Outstanding mortgage balance
              </label>
              <input
                className="dpl2-input"
                id="dpl2-balance"
                type="text"
                inputMode="numeric"
                placeholder="$ 250,000"
                value={debt}
                onChange={(e) => setDebt(formatMoney(e.target.value))}
              />
            </div>
            {stateOpen ? (
              <div className="dpl2-field">
                <label className="dpl2-label" htmlFor="dpl2-state">
                  Property state
                </label>
                <select
                  className="dpl2-input"
                  id="dpl2-state"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                >
                  {stateCodes.map((c) => (
                    <option key={c} value={c}>
                      {STATE_NAMES[c] ?? c}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="dpl2-state">
                Based on a home in {STATE_NAMES[stateCode] ?? stateCode}.{" "}
                <button
                  type="button"
                  className="dpl2-state-change"
                  onClick={() => setStateOpen(true)}
                >
                  Change
                </button>
              </p>
            )}
            <button className="dpl2-btn" type="submit" disabled={!canSubmit || loading}>
              {loading ? "Checking…" : "See their estimate"}
            </button>
            {failed && (
              <p className="dpl2-error">
                Couldn&rsquo;t reach the estimator &mdash; try again, or{" "}
                <a href={APPLY_URL} target="_blank" rel="noopener">
                  apply at Notable directly
                </a>
                .
              </p>
            )}
            <p className="dpl2-fine">Instant estimate &middot; No impact on their credit score</p>
          </form>
        ) : result.limit !== null ? (
          <div>
            <p className="dpl2-result-label">Estimated credit limit</p>
            <p className="dpl2-result-amount">${result.limit.toLocaleString("en-US")}</p>
            {result.aprBps !== null && (
              <p className="dpl2-result-rate">
                Accrues at {(result.aprBps / 12 / 100).toFixed(2)}% per month (
                {(result.aprBps / 100).toFixed(2)}% APR) &mdash; nothing due until close.
              </p>
            )}
            <p className="dpl2-result-note">
              An estimate from Notable based on the details entered, not an offer &mdash;
              applying is how the real number gets confirmed.
            </p>
            <a className="dpl2-btn" href={APPLY_URL} target="_blank" rel="noopener">
              Start their application
            </a>
            <button className="dpl2-reset" type="button" onClick={reset}>
              Run another estimate
            </button>
          </div>
        ) : (
          <div>
            <h4 className="dpl2-denial-h">No estimate for these details</h4>
            <p className="dpl2-denial-p">
              That combination didn&rsquo;t return a credit limit. Applying directly is the
              best way to confirm what your seller qualifies for &mdash; it takes minutes and
              won&rsquo;t impact their credit.
            </p>
            <a className="dpl2-btn" href={APPLY_URL} target="_blank" rel="noopener">
              Apply with Notable
            </a>
            <button className="dpl2-reset" type="button" onClick={reset}>
              Try different details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
