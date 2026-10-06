// The app's answer to a lead is its ESTIMATE ID, as the response body
// (WebHookController.LogEstimateRequest returns StatusCode(status, estimateId)),
// e.g. `99632` or `"99632"`. That id is how a person finds the deal in the app.
//
// Pure, with no path aliases, so scripts/test-giveaway-estimate-id.mjs can run
// it with no build. Anything that is not a plain positive integer is null: an
// empty body, an error page, a word. A body we cannot read must never turn a
// lead the app accepted into a failure, so the caller treats null as "no id".
export function parseEstimateId(body: string | null | undefined): number | null {
  if (typeof body !== "string") return null;
  const m = /^\s*"?(\d{1,12})"?\s*$/.exec(body);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
