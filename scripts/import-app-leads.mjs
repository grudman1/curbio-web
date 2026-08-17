// ─────────────────────────────────────────────────────────────────────────────
// One-time import: app "Leads Report" CSV → config/appLeadsSnapshot.json
//
//   node scripts/import-app-leads.mjs "/path/to/Leads Report.csv" 2026-08-14
//
// The snapshot is SANITIZED RAW DATA, not aggregates: one small record per
// deal, with every identity field (deal title, agent name, agent email,
// brokerage) STRIPPED. The Control Room's rule holds here: identities stay
// masked, the CRM is the contact list. All interpretation — market-code →
// slug, stage → funnel ordinal, referral source → channel — happens in
// config/appLeadsSnapshot.ts, where it is typed and reviewable. This script
// deliberately knows nothing about markets or channels.
//
// When the live app sync exists, the JSON this writes gets DELETED, not
// migrated.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [, , csvPath, asOf] = process.argv;
if (!csvPath || !/^\d{4}-\d{2}-\d{2}$/.test(asOf ?? "")) {
  console.error('usage: node scripts/import-app-leads.mjs <leads-report.csv> <as-of YYYY-MM-DD>');
  process.exit(1);
}

// Minimal CSV parser (quoted fields, embedded commas/newlines).
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
const [header, ...records] = parseCsv(raw);
const col = Object.fromEntries(header.map((h, i) => [h, i]));

for (const required of ["marketCode", "createdDate", "stageName", "statusName", "referralSourceId", "value", "dealTypeName"]) {
  if (!(required in col)) {
    console.error(`missing expected column "${required}" — is this the Leads Report export?`);
    process.exit(1);
  }
}

// "1/6/2026" → "2026-01-06". Rejects anything unparseable rather than
// guessing. DAY-LEVEL on purpose: the Today page's weekly sparklines and
// pace-to-date math need days, and a created date is not PII.
function toDate(mdY) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((mdY ?? "").trim());
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

const deals = [];
let skipped = 0;
for (const r of records) {
  const date = toDate(r[col.createdDate]);
  if (!date) { skipped++; continue; }
  const month = date.slice(0, 7);
  const value = Number(String(r[col.value]).replace(/,/g, ""));
  deals.push({
    // Identity fields (title, agentName, agentEmail, agentOrgName, pmName,
    // rdName) are dropped HERE, at the boundary — they never reach the repo.
    marketCode: r[col.marketCode].trim(),
    date,
    month,
    stage: r[col.stageName].trim(),
    status: r[col.statusName].trim(),
    referralSource: r[col.referralSourceId].trim(),
    dealType: r[col.dealTypeName].trim(),
    value: Number.isFinite(value) && value > 0 ? value : null,
  });
}

const out = {
  asOf,
  source: `app Leads Report export (${deals.length} estimate requests, ${deals[0]?.month ?? "?"}..${asOf})`,
  generatedBy: "scripts/import-app-leads.mjs",
  deals,
};

const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../config/appLeadsSnapshot.json");
writeFileSync(dest, JSON.stringify(out));
console.log(`wrote ${deals.length} deals (${skipped} skipped, no parsable date) → ${dest}`);
