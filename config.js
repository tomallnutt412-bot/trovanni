// Single place to change the brand name and payment settings.
// PUBLIC / TEST values only. NEVER put secret keys (sk_..., PayPal secret) in this file.
window.SITE = {
  BRAND: "Trovanni", // locked brand; changing it swaps the wordmark for plain text at runtime
  payments: {
    mode: "test", // "test" | "live" (live not wired up yet)
    stripe: { publishableKey: "pk_test_PLACEHOLDER", paymentLinks: {} }, // e.g. { e1: "https://buy.stripe.com/test_..." }
    paypal: { clientId: "sandbox-PLACEHOLDER", currency: "GBP" }
  },
  shipping: [
    { id: "std", label: "UK tracked (placeholder)", price: 0 },
    { id: "next", label: "UK next-day special delivery (placeholder)", price: 15 }
  ]
};
