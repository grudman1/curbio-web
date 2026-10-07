#!/usr/bin/env node
// Removes ZZTEST test records from the production Upstash store, so they stop
// showing on /admin (giveaway staff screen, Leads, waitlist panel).
//
// DRY RUN BY DEFAULT — prints every record it would remove and changes nothing.
// Deletes only when re-run with --confirm.
//
//   UPSTASH_REDIS_REST_KV_REST_API_URL=…  \
//   UPSTASH_REDIS_REST_KV_REST_API_TOKEN=…  \
//   node scripts/cleanup-zztest.mjs            # dry run
//   node scripts/cleanup-zztest.mjs --confirm  # delete what the dry run listed
//
// Needs the WRITE token (the read-only one cannot delete). Never commit it.
//
// WHAT COUNTS AS A TEST RECORD — both must hold, deliberately stricter than the
// drawing's "ours" rule (lib/giveaway/entry.ts isTestIdentity):
//   - the name starts with "ZZTEST" (any case), AND
//   - the email's mailbox starts with "zztest" (zztest+…, zztest.…, zztest_…).
// A real agent named "Test …", or a Curbio address, is never touched.
//
// WHAT IT REMOVES
//   giveaway:<slug>:entries    the entry rows the staff screen lists
//   giveaway:<slug>:ids        their id → email lookups
//   giveaway:<slug>:leadrows   their "lead row written" markers
//   leads:v1                   matching rows on the Leads screen
//   leads:delivery:v1          those rows' delivery records
//   waitlist:leads             matching waitlist sign-ups
// It does NOT touch giveaway:<slug>:log (the change history stays as the audit
// trail), the drawing records, the CRM, or ActiveCampaign.

import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
if (!url || !token) {
  console.error("Set UPSTASH_REDIS_REST_KV_REST_API_URL and UPSTASH_REDIS_REST_KV_REST_API_TOKEN (the write token).");
  process.exit(1);
}
const CONFIRM = process.argv.includes("--confirm");
const SLUG = process.env.GIVEAWAY_SLUG ?? "expcon-2026";
const K = {
  entries: `giveaway:${SLUG}:entries`,
  ids: `giveaway:${SLUG}:ids`,
  leadRows: `giveaway:${SLUG}:leadrows`,
  leads: "leads:v1",
  delivery: "leads:delivery:v1",
  waitlist: "waitlist:leads",
};

// Raw strings, not parsed objects: LREM must be handed the exact stored value.
const redis = new Redis({ url, token, automaticDeserialization: false });

export function isZztest(name, email) {
  const n = String(name ?? "").trim();
  const mailbox = String(email ?? "").trim().toLowerCase().split("@")[0];
  return /^zztest\b/i.test(n) && /^zztest([+._-]|$)/.test(mailbox);
}

const parse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
// HGETALL comes back as a flat [field, value, field, value, …] array.
const pairs = (flat) => {
  const out = [];
  for (let i = 0; i + 1 < (flat?.length ?? 0); i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
};

const plan = { entries: [], ids: [], leadRows: [], leads: [], delivery: [], waitlist: [] };

// 1. Giveaway entries (hash keyed by email).
const entryPairs = pairs(await redis.hgetall(K.entries));
const removedEmails = new Set();
const leadIds = new Set();
for (const [field, raw] of entryPairs) {
  const e = parse(raw);
  if (!e || !isZztest(e.name, e.email ?? field)) continue;
  plan.entries.push({ field, label: `${e.name} <${e.email ?? field}> market=${e.marketSlug ?? "not listed"}` });
  removedEmails.add(field);
  if (e.id) plan.ids.push(e.id);
  const leadId = e.routing?.app?.leadId;
  if (leadId) leadIds.add(leadId);
}

// 2. Any id → email lookup pointing at a removed entry (catches ids the entry
//    row no longer carries).
for (const [id, email] of pairs(await redis.hgetall(K.ids))) {
  if (removedEmails.has(email) && !plan.ids.includes(id)) plan.ids.push(id);
}

// 3. Leads screen rows.
for (const raw of (await redis.lrange(K.leads, 0, -1)) ?? []) {
  const l = parse(raw);
  if (!l || !isZztest(l.name, l.email)) continue;
  plan.leads.push({ raw, label: `${l.name} <${l.email}> source=${l.source} market=${l.market ?? "—"}` });
  if (l.leadId) leadIds.add(l.leadId);
}

// 4. Delivery records + giveaway lead-row markers for every lead id above.
const deliveryFields = new Set(pairs(await redis.hgetall(K.delivery)).map(([f]) => f));
const leadRowFields = new Set(pairs(await redis.hgetall(K.leadRows)).map(([f]) => f));
for (const id of leadIds) {
  if (deliveryFields.has(id)) plan.delivery.push(id);
  if (leadRowFields.has(id)) plan.leadRows.push(id);
}

// 5. Waitlist sign-ups.
for (const raw of (await redis.lrange(K.waitlist, 0, -1)) ?? []) {
  const w = parse(raw);
  if (!w || !isZztest(w.name, w.email)) continue;
  plan.waitlist.push({ raw, label: `${w.name} <${w.email}> ZIP ${w.zip || "—"} from ${w.waitlistFrom ?? "—"}` });
}

// ── Report ───────────────────────────────────────────────────────────────────
const show = (title, key, rows, fmt) => {
  console.log(`\n${title} — ${key}: ${rows.length}`);
  for (const r of rows) console.log(`  - ${fmt(r)}`);
};
console.log(CONFIRM ? "DELETING the records below." : "DRY RUN — nothing will be changed.");
show("Giveaway entries", K.entries, plan.entries, (r) => r.label);
show("Entry id lookups", K.ids, plan.ids, (r) => r);
show("Lead-row markers", K.leadRows, plan.leadRows, (r) => r);
show("Leads screen rows", K.leads, plan.leads, (r) => r.label);
show("Delivery records", K.delivery, plan.delivery, (r) => r);
show("Waitlist sign-ups", K.waitlist, plan.waitlist, (r) => r.label);
console.log(`\nNot touched: giveaway:${SLUG}:log (audit trail), drawing records, CRM, ActiveCampaign.`);

if (!CONFIRM) {
  console.log("\nRe-run with --confirm to delete exactly these.");
  process.exit(0);
}

// ── Delete ───────────────────────────────────────────────────────────────────
const n = { entries: 0, ids: 0, leadRows: 0, leads: 0, delivery: 0, waitlist: 0 };
if (plan.entries.length) n.entries = await redis.hdel(K.entries, ...plan.entries.map((r) => r.field));
if (plan.ids.length) n.ids = await redis.hdel(K.ids, ...plan.ids);
if (plan.leadRows.length) n.leadRows = await redis.hdel(K.leadRows, ...plan.leadRows);
if (plan.delivery.length) n.delivery = await redis.hdel(K.delivery, ...plan.delivery);
for (const r of plan.leads) n.leads += await redis.lrem(K.leads, 1, r.raw);
for (const r of plan.waitlist) n.waitlist += await redis.lrem(K.waitlist, 1, r.raw);
console.log("\nDeleted:", n);
