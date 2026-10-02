// ─────────────────────────────────────────────────────────────────────────────
// Checks for how a giveaway entry is attributed (lib/giveaway/attribution.ts),
// against the REAL eXpcon settings:
//
//   npx tsx scripts/test-giveaway-attribution.mjs
//
// (tsx, not plain node: the module imports lib/channels without an extension.)
// No build, no network, no stored entries. Run it after ANY change to
// attribution.ts, config/giveaways/expcon.ts's `attribution`, or lib/channels.ts.
//
// The three cases the production test script repeats against the live page:
//   1. no tag        a QR scan / the bare address
//   2. email tag     utm_source=email&utm_medium=e&utm_campaign=nurture-expcon-oct
//   3. LinkedIn tag  utm_source=organic&utm_medium=social&utm_campaign=social-expcon-oct&utm_content=linkedin
// Each must show the right channel and campaign AND ReferralSourceId "eXp realty".
// ─────────────────────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import { attributionFrom } from "../lib/giveaway/attribution.ts";
import { expcon } from "../config/giveaways/expcon.ts";

const REF = "eXp realty";
const a = (body) => attributionFrom(body, expcon);
let n = 0;
const check = (name, fn) => { fn(); n++; console.log(`  ok  ${name}`); };

check("1. NO TAG → the page's full defaults, eXp referral, marked defaulted", () => {
  const r = a({});
  assert.deepEqual(
    { s: r.utm_source, m: r.utm_medium, c: r.utm_campaign, ch: r.channel, ref: r.referralSourceId, d: r.defaulted, ftc: r.firstTouchChannel, ftk: r.firstTouchCampaign, ep: r.entryPoint },
    { s: "event", m: "qr", c: "expcon-giveaway-oct", ch: "event", ref: REF, d: true, ftc: "event", ftk: "expcon-giveaway-oct", ep: "web_form" }
  );
});
check("1b. a blank utm_source counts as no tag (?utm_source= must not beat the default)", () => {
  for (const blank of ["", "   ", null, undefined]) {
    const r = a({ utm_source: blank, utm_medium: "x", utm_campaign: "y" });
    assert.equal(r.channel, "event"); assert.equal(r.utm_medium, "qr"); assert.equal(r.utm_campaign, "expcon-giveaway-oct"); assert.equal(r.defaulted, true);
  }
});
check("2. EMAIL TAG → Email / e / nurture-expcon-oct, eXp referral, not defaulted", () => {
  const r = a({ utm_source: "email", utm_medium: "e", utm_campaign: "nurture-expcon-oct" });
  assert.deepEqual({ ch: r.channel, s: r.utm_source, m: r.utm_medium, c: r.utm_campaign, ref: r.referralSourceId, d: r.defaulted, ftc: r.firstTouchChannel, ftk: r.firstTouchCampaign },
    { ch: "email", s: "email", m: "e", c: "nurture-expcon-oct", ref: REF, d: false, ftc: "email", ftk: "nurture-expcon-oct" });
});
check("2b. cold email → Email / cold-expcon-oct", () => {
  const r = a({ utm_source: "email", utm_medium: "e", utm_campaign: "cold-expcon-oct" });
  assert.equal(r.channel, "email"); assert.equal(r.utm_campaign, "cold-expcon-oct"); assert.equal(r.referralSourceId, REF);
});
check("3. LINKEDIN TAG → Organic / social / social-expcon-oct / content linkedin, eXp referral", () => {
  const r = a({ utm_source: "organic", utm_medium: "social", utm_campaign: "social-expcon-oct", utm_content: "linkedin" });
  assert.deepEqual({ ch: r.channel, m: r.utm_medium, c: r.utm_campaign, content: r.utm_content, ref: r.referralSourceId, d: r.defaulted },
    { ch: "organic", m: "social", c: "social-expcon-oct", content: "linkedin", ref: REF, d: false });
});
check("3b. HSM personal LinkedIn → HSM field; paid social → Paid social; both keep the eXp referral", () => {
  const h = a({ utm_source: "hsm_field", utm_medium: "social", utm_campaign: "social-expcon-oct", utm_content: "linkedin" });
  assert.equal(h.channel, "hsm_field"); assert.equal(h.referralSourceId, REF);
  const p = a({ utm_source: "paid_social", utm_medium: "social", utm_campaign: "paid-expcon-oct", utm_content: "instagram" });
  assert.equal(p.channel, "paid_social"); assert.equal(p.utm_content, "instagram"); assert.equal(p.referralSourceId, REF);
});
check("4. REAL TAGS WIN: the page's channel and campaign never replace them", () => {
  for (const t of [["email", "nurture-expcon-oct"], ["organic", "social-expcon-oct"], ["partnership", "exp-partner-landingpage"]]) {
    const r = a({ utm_source: t[0], utm_medium: "m", utm_campaign: t[1] });
    assert.notEqual(r.channel, "event"); assert.equal(r.utm_campaign, t[1]); assert.notEqual(r.utm_campaign, "expcon-giveaway-oct");
  }
});
check("4b. a real source with no medium or campaign keeps them empty — never half our defaults", () => {
  const r = a({ utm_source: "email" });
  assert.equal(r.utm_medium, null); assert.equal(r.utm_campaign, null); assert.equal(r.channel, "email");
});
check("4c. an unknown source lands as direct (no phantom channel) — still with the eXp referral", () => {
  const r = a({ utm_source: "newsletter-x", utm_medium: "e", utm_campaign: "c-d" });
  assert.equal(r.channel, "direct"); assert.equal(r.referralSourceId, REF);
});
check("5. THE eXp REFERRAL CANNOT BE CHANGED OR REMOVED from the URL or the request", () => {
  for (const evil of ["Somebody Else", "", "  ", null, "eXp Realty Boston", 42]) {
    for (const tags of [{}, { utm_source: "email", utm_campaign: "nurture-expcon-oct" }, { utm_source: "organic", utm_campaign: "social-expcon-oct" }]) {
      assert.equal(a({ ...tags, referralSourceId: evil }).referralSourceId, REF);
      assert.equal(a({ ...tags, referral_source_id: evil }).referralSourceId, REF);
    }
  }
});
check("6. FIRST TOUCH is write-once: a browser's earlier record is kept, even on a later tag", () => {
  const r = a({ utm_source: "organic", utm_medium: "social", utm_campaign: "social-expcon-oct", firstTouchChannel: "email", firstTouchCampaign: "nurture-expcon-oct" });
  assert.equal(r.firstTouchChannel, "email"); assert.equal(r.firstTouchCampaign, "nurture-expcon-oct"); assert.equal(r.channel, "organic");
});
check("6b. no earlier record → first touch is THIS entry's own channel and campaign", () => {
  const r = a({ utm_source: "email", utm_medium: "e", utm_campaign: "cold-expcon-oct" });
  assert.equal(r.firstTouchChannel, "email"); assert.equal(r.firstTouchCampaign, "cold-expcon-oct");
});
check("7. values are trimmed and capped at 200 characters", () => {
  const r = a({ utm_source: " email ", utm_campaign: "x".repeat(500), utm_content: " linkedin " });
  assert.equal(r.utm_source, "email"); assert.equal(r.utm_campaign.length, 200); assert.equal(r.utm_content, "linkedin");
});
check("8. the settings really say eXp realty and the booth defaults", () => {
  assert.equal(expcon.attribution.referralSourceId, REF);
  assert.deepEqual(expcon.attribution.defaults, { utm_source: "event", utm_medium: "qr", utm_campaign: "expcon-giveaway-oct" });
});
console.log(`attribution: ${n} checks passed`);
