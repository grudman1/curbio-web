// Checks for reading the app's estimate id out of its response body
// (lib/giveaway/estimateId.ts):   node scripts/test-giveaway-estimate-id.mjs
// (Node 22.18+; otherwise npx tsx.) No build, no network.
import assert from "node:assert/strict";
import { parseEstimateId } from "../lib/giveaway/estimateId.ts";
const ok = [["99632", 99632], ['"99632"', 99632], [" 99632\n", 99632], ["1", 1], ["100001", 100001]];
for (const [body, id] of ok) assert.equal(parseEstimateId(body), id, `${JSON.stringify(body)} → ${id}`);
const none = ["", "   ", "null", "Created", "<html>502</html>", "0", "-5", "12.5", "9".repeat(20), '{"id":5}', "12 34", null, undefined];
for (const body of none) assert.equal(parseEstimateId(body), null, `${JSON.stringify(body)} → null`);
console.log(`estimate id: ${ok.length + none.length} checks passed`);
