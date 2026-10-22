// node --test worker/test/  — checkout Worker must refuse price-on-request (earring) SKUs server-side.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import worker from "../index.js";
import { isPriceOnRequest } from "../guard.js";
const ROOT = new URL("../../", import.meta.url);
const productsJs = fs.readFileSync(new URL("products.js", ROOT), "utf8");
const PRODUCTS = JSON.parse(productsJs.slice(productsJs.indexOf("window.PRODUCTS=") + 16, productsJs.indexOf("];", productsJs.indexOf("window.PRODUCTS=")) + 1));
const env = { STRIPE_SECRET_KEY: "sk_test_dummy", ALLOW_LIVE: "true", ASSETS: { fetch: async () => new Response(productsJs) } };
let stripeCalls = 0;
globalThis.fetch = async () => { stripeCalls++; return new Response(JSON.stringify({ url: "https://checkout.stripe.test/s" }), { status: 200 }); };
const post = (body) => worker.fetch(new Request("https://trovanni.co.uk/api/checkout", { method: "POST", body: JSON.stringify(body) }), env);
const earrings = PRODUCTS.filter((p) => p.product_type === "configurable_earrings");
const ring = PRODUCTS.find((p) => p._site && p._site.configurable && p._site.purchasable && !p._site.price_unapproved);

test("15 earrings present, all price on request, none priced", () => {
  assert.equal(earrings.length, 15);
  for (const p of earrings) { assert.ok(isPriceOnRequest(p)); assert.equal(p.price.gbp, null); assert.equal(p._site.purchasable, false); }
});
test("every earring SKU is refused by POST /api/checkout", async () => {
  for (const p of earrings) { const r = await post({ items: [{ id: p.sku, q: 1 }] }); assert.equal(r.status, 400); assert.match((await r.json()).error, /price on request/); }
});
test("guard still refuses a tampered record (purchasable:true, live, price set)", () => {
  const t = structuredClone(earrings[0]); t._site.purchasable = true; t.status = "live"; t.price.gbp = 1; t._site.price_on_request = false; t._site.enquiry_only = false;
  assert.ok(isPriceOnRequest(t));
});
test("guard does not block normal priced items", () => { for (const p of PRODUCTS.filter((x) => x.product_type !== "configurable_earrings")) assert.equal(isPriceOnRequest(p), false, p.sku); });
for (const [name, items] of [
  ["single earring", [{ id: "TRV-ER-001", q: 1 }]],
  ["lowercase / padded id", [{ id: " trv-er-002 ", q: 1 }]],
  ["earring with fake opts + price", [{ id: "TRV-ER-003", q: 1, opts: { metal: "gold_9ct_yellow", carat: 1, stone: "moissanite" }, price: 1, unit_gbp: 1 }]],
  ["earring mixed with a valid ring", [ring && { id: ring.sku, q: 1, opts: { metal: ring.configurable.default_selection.metal, carat: ring.configurable.default_selection.centre_carat, stone: ring.configurable.default_selection.stone_type, size: (ring.configurable.options.ring_size_uk || [""])[0] } }, { id: "TRV-ER-015", q: 1 }].filter(Boolean)],
]) {
  test(`POST /api/checkout rejects: ${name}`, async () => {
    const before = stripeCalls; const r = await post({ items, ship: "std" }); const j = await r.json();
    assert.equal(r.status, 400); assert.match(j.error, /no longer available|price on request/); assert.equal(stripeCalls, before, "Stripe must not be called");
  });
}
test("control: an approved ring still checks out", { skip: !ring }, async () => {
  const d = ring.configurable.default_selection;
  const r = await post({ items: [{ id: ring.sku, q: 1, opts: { metal: d.metal, carat: d.centre_carat, stone: d.stone_type, size: (ring.configurable.options.ring_size_uk || [""])[0] } }], ship: "std" });
  assert.equal(r.status, 200);
});
