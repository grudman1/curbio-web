// The market picker's "this market was chosen by hand" flag.
//
// A market card navigates to ?market=<slug> — exactly the URL a campaign link
// uses — so by the time the form submits, a pick and a link look identical.
// The picker writes the chosen slug here; FormCard reads it to record
// "Decided by: picked in the market picker" instead of "campaign link".
//
// sessionStorage, deliberately: it lasts this tab's visit only, is never sent
// to a server or a third party, and holds nothing but a market slug — a
// functional UI flag, not a tracking identifier. Every access is guarded;
// blocked storage just means the lead is recorded as a link.

const KEY = "curbio_market_pick";

export function writeMarketPick(slug: string): void {
  try {
    sessionStorage.setItem(KEY, slug);
  } catch {}
}

export function readMarketPick(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
