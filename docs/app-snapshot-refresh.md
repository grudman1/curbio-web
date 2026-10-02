# Refreshing the app snapshot (weekly)

The Hub's Qualified, close-rate, revenue and market numbers come from two
sources joined at one date, `asOf`:

| Days | Source | What it contains |
|---|---|---|
| on or before `asOf` | `config/appLeadsSnapshot.json` (the app export) | every deal — website, curbio.com, phone, manual — with its current stage, status and revenue |
| after `asOf` | the live feed (Redis, `lib/leadStore.ts`) | sell.curbio.com leads only, stage "Lead" |

Each refresh moves `asOf` forward, so the live-only stretch is never more than a
week and everything before it carries today's stages, wins and revenue. The
fence is exact: the export's own day is partial, so `asOf` is the **day before**
the export and deals created on the export day are left to the live feed until
the next refresh. Nothing is counted twice.

## Steps (about 10 minutes)

**1. Export from the app.** Download all three reports, full year to date:
Attribution report, Leads report, Sales report. They land in `~/Downloads` as
`reports_attributionreport (N).csv` and so on.

**2. Fresh branch from main** (CLAUDE.md: never reuse an old branch).

```bash
cd ~/_source/curbio-web && git fetch --prune origin && git checkout -b data/app-snapshot-$(date +%F) origin/main
```

**3. Copy the exports into `data/imports/`** under their fixed names, replacing
last week's files:

```bash
cp ~/Downloads/"reports_attributionreport (N).csv" data/imports/reports_attributionreport.csv
```
```bash
cp ~/Downloads/"reports_leadsreport (N).csv" data/imports/reports_leadsreport.csv
```
```bash
cp ~/Downloads/"reports_salesreport (N).csv" data/imports/reports_salesreport.csv
```

**4. Build the snapshot.**

```bash
npx tsx scripts/import-app-snapshot.ts
```

Add `--exported YYYY-MM-DD` only if you downloaded the reports on an earlier
day — the importer sets `asOf` to the day before it.

Read the printed report. Stop and ask if `unknownMarketCodes` is not empty (a
new app market needs a row in `config/market-map.ts`) or if
`attrRowsWithoutLeadsRow` is suddenly large (the export format changed).

**5. Check the live feed against the export** — before committing. `--from` is
the PREVIOUS snapshot's `asOf` (run `git show origin/main:config/appLeadsSnapshot.json | head -c 40` to see it).

```bash
UPSTASH_REDIS_REST_KV_REST_API_URL='…' UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN='…' node scripts/compare-export-vs-live.mjs --from <previous asOf>
```

Use the READ-ONLY token (Upstash console → the database → REST API → read-only
token). It is marked sensitive in Vercel, so `vercel env pull` returns it blank.
Every difference is printed with its likely reason; the usual ones are failed
deliveries and `@curbio.com` tests (live only), and deals someone keyed into
the app by hand as web_form (export only).

**6. Commit and open a PR.** The commit is `config/appLeadsSnapshot.json`, the
three `data/imports/reports_*.csv` files and `data/imports/import-report.json`. Paste the step-5 output into the PR.

**Optional — Mailchimp.** Backfilled email leads are matched to a campaign by
send time using `data/imports/mailchimp-campaigns.csv`. If that file is older
than the new leads, those leads keep channel `email` but get no campaign.
Re-export the Mailchimp campaign report to the same filename to fill them in.

## What changes on the Hub after a refresh

- Closed, close rate and revenue move for old months too. A lead from July that
  won last week is now a July win, and its revenue lands in the month it was
  won.
- Months younger than 60 days are still marked "still maturing" on close rate.
- Leads the HSMs re-keyed or merged in the app now show as the app has them.
- HSM rows on Performance are rolled up from each market's HSM in
  `config/markets.ts` — a deal is credited to the market's HSM today, not to
  the HSM named on the deal.
