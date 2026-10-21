// Single place to change the brand name and payment settings.
// PUBLIC values only. NEVER put secret keys (sk_..., PayPal secret) in this file.
window.SITE = {
  BRAND: "Trovanni", // locked brand; changing it swaps the wordmark for plain text at runtime
  payments: {
    mode: "live", // Stripe Checkout (card, Apple Pay, Google Pay) via the Worker. PayPal not offered yet.
    stripe: { checkoutEndpoint: "/api/checkout" }, // hosted Stripe Checkout via the Worker; no publishable key needed. Secret lives in Cloudflare (STRIPE_SECRET_KEY)
  },
  shipping: [
    { id: "std", label: "Royal Mail tracked (free)", price: 0 },
    { id: "next", label: "Royal Mail Special Delivery, next working day", price: 15 }
  ]
};
