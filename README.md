# Trovanni – shop prototype (editorial film direction)

This is a static site: plain HTML, CSS and vanilla JS, with no build step. It is made to be deployed on GitHub + Cloudflare Pages
(set build command to none and the output dir to this folder). It is a **prototype**: every product, price and policy here is a sample/placeholder.

## Brand
The brand is **Trovanni** (from the Italian *trovare*, to find). Wordmark, hero, favicon and colours live in `_src/brand.py`.
- Safety valve: `config.js` → `SITE.BRAND`. Changing it at runtime swaps the wordmark for plain text and updates titles and favicon.
- To bake in a different name: `python3 _src/build.py --preview-samples --name "Other" --out /tmp/other` (plain-text wordmark).

## Data
- `products.js` holds the sample listings. Replace it with real data later (same fields: id, name, category, metal, gender, price, era, condition, hallmark, measurements, engagement).
- Engagement ring stones must always be written as "laboratory-grown diamond", in full.

## Payments (currently TEST MODE / MOCK)
`config.js → SITE.payments` holds **public/test values only**:
```js
payments: { mode: "test",
  stripe: { publishableKey: "pk_test_PLACEHOLDER", paymentLinks: {} },
  paypal: { clientId: "sandbox-PLACEHOLDER", currency: "GBP" } }
```
The stub handlers are in `app.js` (search for "Payment stubs"). Right now both resolve straight away with a fake reference and redirect to
`order-confirmation.html`. No SDKs are loaded and no real payments are made.

**NEVER put secret keys client-side.** That means Stripe `sk_live_` / `sk_test_` keys, restricted keys, webhook secrets and the PayPal client secret. Anything in this folder is public.

Real integration later:
1. **Stripe (simplest):** create a Payment Link per product (or per basket) in the Stripe dashboard, test mode first, and put the URLs in
   `stripe.paymentLinks` keyed by product id. In `handlers.stripe`, `location.href = paymentLinks[id]`, and set the link's success URL to
   `/order-confirmation.html`. For a full multi-item basket, use a Cloudflare Pages Function (server-side, holding the secret key as an
   environment variable) that creates a Checkout Session.
2. **PayPal:** load `https://www.paypal.com/sdk/js?client-id=<clientId>&currency=GBP` only once a real sandbox client id exists. Render
   `paypal.Buttons()` inside the payment step. Capture/verify the order server-side (Pages Function with the secret in an env var).
3. When everything is tested, flip `mode` to `"live"` and swap in the live public keys/links. Remove the TEST MODE banners.

## Basket
Stored in `localStorage` (`bn_basket`). The last mock order is stored under `bn_lastorder`.

## Name variants (parked)
The shortlist variants are parked in `_parked/variants/`. `_src/variants.py` only runs with `--run`.

## Product data (schema v2) and publishing modes
- Source: `_src/data/products.source.json` (Sales schema v2, `_src/data/product-schema.json`). Public `products.js` is generated; internal fields are stripped and leak-checked.
- `python3 _src/build.py --preview-samples`: PREVIEW. Only sample/example records (`is_example_data: true`), badged "Sample listing". Used by the local servers.
- `python3 _src/build.py`: PRODUCTION (default). Only real records that are live/reserved/sold, enabled for the website, `price_approved_by_tom: true` with `price_approved_at`, **and** a matching entry in `_src/data/approvals.lock.json`. If the price has changed since approval, the record is blocked with a warning.
- `python3 _src/data/publish.py approve BN-000123 2026-10-20`: record Tom's approval of the current price. Only on Tom's explicit instruction.
- `python3 _src/data/publish.py set-price BN-000123 450`: change a price and reset approval.
- Tests: `python3 _src/data/test_publish.py` (these run automatically before every build). Sales validator: `/tmp/jsv/bin/python /workspace/rebrand/sales/validate_products.py`.
- Photos: put real files in `_src/images/products/<sku>-<nn>-<type>.jpg`. The build marks which ones exist; missing ones show placeholder blocks.

## Stripe Checkout (TEST mode, branch stripe-checkout)
- `worker/index.js` handles `POST /api/checkout`: looks up every price server-side from `products.js` (schema v5 price rule for configured rings; one-of-one for vintage), then creates a hosted Stripe Checkout Session in GBP with UK-only shipping address collection. Client-sent prices are ignored.
- Line item names spell out metal, carat and "laboratory-grown diamond" or "moissanite (not a diamond)", plus UK ring size.
- Secret: Cloudflare secret `STRIPE_SECRET_KEY` (test key). The Worker refuses non-test keys unless `ALLOW_LIVE=true`.
- Success: `checkout-success.html` (clears basket). Cancel: `checkout-cancelled.html`.
- Shipping amounts are mirrored in `worker/index.js` (`SHIPPING`) — keep in sync with `config.js`.
- Not yet: webhook for order fulfilment/emails; PayPal is still a mock.
