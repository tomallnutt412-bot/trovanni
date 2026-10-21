// Trovanni Worker: serves the static site (ASSETS) and creates Stripe Checkout Sessions at POST /api/checkout.
// Secret key comes ONLY from the Cloudflare secret env var STRIPE_SECRET_KEY (never committed).
// Prices are looked up server-side from /products.js; anything price-like sent by the browser is ignored.

// Mirror of SITE.shipping in config.js (server is the source of truth for the charged amount).
const SHIPPING = {
  std: { label: "Royal Mail tracked", gbp: 0 },
  next: { label: "Royal Mail Special Delivery, next working day", gbp: 15 },
};
const MAX_RING_QTY = 3;

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function loadProducts(env, url) {
  const r = await env.ASSETS.fetch(new Request(new URL("/products.js", url)));
  if (!r.ok) throw new Error("products.js unavailable");
  const t = await r.text();
  const start = t.indexOf("window.PRODUCTS=");
  const end = t.indexOf("];", start);
  if (start < 0 || end < 0) throw new Error("products.js format");
  return JSON.parse(t.slice(start + "window.PRODUCTS=".length, end + 1));
}

const cfg = (p) => (p._site && p._site.configurable ? p.configurable : null);

function excluded(c, o) {
  return (c.excluded_combinations || []).some(
    (x) =>
      (x.metal == "*" || x.metal == null || x.metal == o.metal) &&
      (x.centre_carat == "*" || x.centre_carat == null || +x.centre_carat == +o.carat) &&
      (x.stone_type == "*" || x.stone_type == null || x.stone_type == o.stone)
  );
}

// Returns { name, unit_gbp, meta } or throws a user-safe Error.
function priceLine(p, opts) {
  if (!p._site || !p._site.purchasable || p.status !== "live") throw new Error(`${p.sku} is not available`);
  if (p._site.price_unapproved) throw new Error(`${p.sku} is not yet on sale`);
  const title = p.title.website;
  const c = cfg(p);
  if (!c) return { name: title, unit_gbp: p.price.gbp, meta: { sku: p.sku } };
  if (!opts) throw new Error(`${p.sku} needs options`);
  const O = c.options;
  const m = O.metal.find((x) => x.code === opts.metal && x.available !== false);
  const k = O.centre_carat.find((x) => +x.centre_carat === +opts.carat);
  const s = O.stone_type.find((x) => x.code === opts.stone);
  if (!m || !k || !s || excluded(c, opts)) throw new Error(`${p.sku}: that combination isn't available`);
  if (O.ring_size_uk && !O.ring_size_uk.includes(opts.size)) throw new Error(`${p.sku}: choose a ring size`);
  const adj = k.price_adjustment_gbp[s.code];
  if (typeof adj !== "number") throw new Error(`${p.sku}: price unavailable`);
  const unit = c.base_price_gbp + m.price_adjustment_gbp + adj + s.price_adjustment_gbp; // schema v5 price_rule
  const stone = s.code === "moissanite" ? "moissanite (not a diamond)" : "laboratory-grown diamond";
  const shortTitle = title.split(" – ")[0];
  const name = `${shortTitle} – ${m.label}, ${(+k.centre_carat).toFixed(1)}ct ${stone}, UK size ${opts.size}`;
  return {
    name,
    unit_gbp: unit,
    meta: { sku: p.sku, metal: m.code, carat: String(k.centre_carat), stone: s.code, size: opts.size },
  };
}

function form(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (typeof v === "object") form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function checkout(request, env) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Payments are not configured yet." }, 503);
  if (!env.STRIPE_SECRET_KEY.startsWith("sk_test_") && !env.STRIPE_SECRET_KEY.startsWith("rk_test_") && env.ALLOW_LIVE !== "true")
    return json({ error: "Test mode only: live keys are refused." }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (!items.length) return json({ error: "Your basket is empty." }, 400);
  const ship = SHIPPING[body.ship] || SHIPPING.std;

  let products;
  try { products = await loadProducts(env, request.url); } catch { return json({ error: "Catalogue unavailable" }, 500); }

  const line_items = [], seen = new Set(), meta = {};
  try {
    items.forEach((it, i) => {
      const p = products.find((x) => x.sku === String(it.id));
      if (!p) throw new Error("An item in your basket is no longer available.");
      const isRing = !!cfg(p);
      if (!isRing) { if (seen.has(p.sku)) throw new Error(`${p.sku} is one-of-one`); seen.add(p.sku); }
      const q = isRing ? Math.min(Math.max(parseInt(it.q, 10) || 1, 1), MAX_RING_QTY) : 1;
      const o = it.opts ? { metal: String(it.opts.metal), carat: +it.opts.carat, stone: String(it.opts.stone), size: String(it.opts.size || "") } : null;
      const l = priceLine(p, o);
      line_items.push({
        quantity: q,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(l.unit_gbp * 100),
          product_data: { name: l.name.slice(0, 250), metadata: l.meta },
        },
      });
      meta[`item_${i}`] = Object.values(l.meta).join("|").slice(0, 500);
    });
  } catch (e) { return json({ error: e.message }, 400); }

  const origin = new URL(request.url).origin;
  const params = {
    mode: "payment",
    currency: "gbp",
    line_items,
    shipping_address_collection: { allowed_countries: ["GB"] },
    shipping_options: [{ shipping_rate_data: { type: "fixed_amount", display_name: ship.label, fixed_amount: { amount: ship.gbp * 100, currency: "gbp" } } }],
    phone_number_collection: { enabled: true },
    billing_address_collection: "auto",
    success_url: `${origin}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout-cancelled.html`,
    metadata: { source: "trovanni-site", ...meta },
  };
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
    body: form(params),
  });
  const s = await r.json();
  if (!r.ok) { console.log("stripe error", s.error && s.error.message); return json({ error: "Couldn't start checkout. Please try again." }, 502); }
  return json({ url: s.url });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/checkout") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return checkout(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
