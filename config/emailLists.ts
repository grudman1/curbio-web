// ─────────────────────────────────────────────────────────────────────────────
// WHERE AN OPT-IN CONTACT GOES IN ACTIVECAMPAIGN.
//
// Two lists per contact: their MARKET's list, and the ENGAGED list (below).
//
// Verified against the live account on 2026-10-01, not assumed:
//
//   list 3  Master Contact List   1 active contact — effectively unused
//   list 4  NOVA             10,003
//   list 5  ATLANTA          28,603
//   list 6  MARYLAND         11,012
//   list 7  DC                2,781
//   list 8  LOS ANGELES      40,976   ← Riverside contacts live here too
//   list 9  DALLAS           19,850
//
// There is no single opt-in list. A contact belongs to their MARKET's list,
// and the `Market` custom field (id 12) carries the value that tells Riverside
// from Los Angeles inside list 8. The values in use are upper-case
// words — ATLANTA, DALLAS, MARYLAND, NOVA, DC, LA, RIVERSIDE — which are
// neither our slugs nor the CRM's names, hence a mapping rather than a
// derivation.
//
// Seattle has no list (it opened after the Mailchimp audiences were built),
// and an agent outside every market has no market list by definition. Both go
// to the Master Contact List, which exists, is empty, and is the only list
// that does not imply a market. Creating a Seattle list is a marketing
// decision for whoever sends to it; when one exists, add the row below and
// nothing else changes.
//
// This is a mapping onto ANOTHER SYSTEM'S identifiers, which is why it lives
// here and not as a field on config/markets.ts — the same reason
// config/market-map.ts owns the app's market codes. A market missing from the
// map is not an error; it falls back.
// ─────────────────────────────────────────────────────────────────────────────

import { MARKET_BY_SLUG } from "./markets";

/** ActiveCampaign custom field holding the market word. */
export const AC_MARKET_FIELD_ID = 12;

/** "Master Contact List" — for contacts with no market list of their own. */
export const AC_FALLBACK_LIST_ID = 3;

/**
 * THE ENGAGED LIST — the one audience of everyone who has raised a hand with
 * us, in every market. Every giveaway entrant goes on it IN ADDITION to their
 * market's list (decided 2026-10-01), "Yes" leads included, so Marketing's
 * automations can run off a single list and treat the "Yes" ones differently
 * by their tag (`expcon-2026-listing-yes`).
 *
 * FOUND BY NAME, not id. As of 2026-10-01 this list does not exist in the
 * account yet (only lists 3–9 do), so there is no id to write down. Once it
 * does, nothing here needs to change as long as it is called exactly this
 * (case does not matter) — and if it is called something else, change this one
 * word.
 *
 * Until the list can be found, the sync FAILS CLOSED: it stops before writing
 * anything to ActiveCampaign, so nobody is put on a market list and quietly
 * left off this one. Entries are kept, the entries screen lists them under
 * "Needs attention" with the reason, and "Sync now" finishes the job once the
 * list exists (lib/giveaway/emailList.ts → engagedListId).
 */
export const AC_ENGAGED_LIST_NAME = "Engaged";

type EmailListTarget = {
  listId: number;
  /** Value for the `Market` custom field. `null` leaves the field untouched. */
  marketValue: string | null;
};

const BY_MARKET_SLUG: Record<string, EmailListTarget> = {
  "northern-virginia": { listId: 4, marketValue: "NOVA" },
  atlanta: { listId: 5, marketValue: "ATLANTA" },
  maryland: { listId: 6, marketValue: "MARYLAND" },
  "washington-dc": { listId: 7, marketValue: "DC" },
  "los-angeles": { listId: 8, marketValue: "LA" },
  riverside: { listId: 8, marketValue: "RIVERSIDE" },
  dallas: { listId: 9, marketValue: "DALLAS" },
  seattle: { listId: AC_FALLBACK_LIST_ID, marketValue: "SEATTLE" },
};

/**
 * The list and Market value for a market slug, or the fallback list with the
 * field left alone when there is no market (an out-of-area contact) or no row.
 *
 * Leaving the field alone matters for a contact who is ALREADY in
 * ActiveCampaign: overwriting a real "ATLANTA" with a blank because they
 * picked "not listed" on a form would destroy data to record a non-answer.
 */
export function emailListFor(marketSlug: string | null | undefined): EmailListTarget {
  const row = marketSlug ? BY_MARKET_SLUG[marketSlug] : undefined;
  return row ?? { listId: AC_FALLBACK_LIST_ID, marketValue: null };
}

/** Slugs in the map that are not real markets — a typo here would silently
 *  send a market's contacts to the fallback list. Checked by the guard below
 *  the first time the email-list sync runs. */
export function unknownEmailListSlugs(): string[] {
  return Object.keys(BY_MARKET_SLUG).filter((slug) => !MARKET_BY_SLUG[slug]);
}
