// Price-on-request items (earrings, schema v6 site extension) are enquiry-only: never charge for them, whatever the browser sends.
export function isPriceOnRequest(p) {
  const s = (p && p._site) || {};
  if (!p) return true;
  const cfg = s.configurable && p.configurable;
  return !!(s.price_on_request || s.enquiry_only || p.product_type === "configurable_earrings" || p.price_on_request ||
    /^TRV-ER-/i.test(String(p.sku)) || !p.price || (typeof p.price.gbp !== "number" && !cfg));
}

