// Single place to change the brand name and payment settings.
// PUBLIC / TEST values only. NEVER put secret keys (sk_..., PayPal secret) in this file.
window.SITE = {
  BRAND: "Trovanni", // locked brand; changing it swaps the wordmark for plain text at runtime
  payments: {
    mode: "test", // Stripe: TEST mode (Worker refuses live keys). PayPal: still a sandbox mock.
    stripe: { checkoutEndpoint: "/api/checkout" }, // hosted Stripe Checkout via the Worker; no publishable key needed. Secret lives in Cloudflare (STRIPE_SECRET_KEY).
    paypal: { clientId: "sandbox-PLACEHOLDER", currency: "GBP" }
  },
  shipping: [
    { id: "std", label: "UK tracked (placeholder)", price: 0 },
    { id: "next", label: "UK next-day special delivery (placeholder)", price: 15 }
  ]
};
