# Trovanni — website (preview)

Static site for Trovanni: vintage & pre-owned jewellery and watches, plus lab-grown diamond engagement rings.

- Plain static HTML/CSS/JS at the repo root. **No build step.**
- Cloudflare Pages: build command = *(none)*, output directory = `/` (root).
- Preview only: every page is `noindex,nofollow` and `robots.txt` disallows all crawling.
- Payments are **test mocks only** (Stripe test / PayPal sandbox placeholders in `config.js`). See `PAYMENTS.md` for going live. Never commit secret keys.
- Products/dummy listings live in `products.js`.
