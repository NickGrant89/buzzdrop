const DEFAULT_MARKUP = parseFloat(process.env.PRICE_MARKUP ?? "2.2");
const MIN_MARGIN_PERCENT = parseFloat(process.env.PRICE_MIN_MARGIN ?? "30");

/** How shipping affects shelf prices — see PRICE_SHIPPING_MODE in .env.example */
export type ShippingPriceMode = "at_cost" | "in_markup" | "none";

export function getShippingPriceMode(): ShippingPriceMode {
  const mode = (process.env.PRICE_SHIPPING_MODE ?? "at_cost").trim();
  if (mode === "in_markup" || mode === "none") return mode;
  return "at_cost";
}

/** Cap freight used in pricing so sensitive/heavy lines do not inflate shelf prices. */
export function shippingForPricing(estimatedShipping: number): number {
  const cap = parseFloat(process.env.CJ_SHIPPING_PRICE_CAP_GBP ?? "6.99");
  if (!Number.isFinite(cap) || cap <= 0) return estimatedShipping;
  return Math.min(Math.max(estimatedShipping, 0), cap);
}

export function landedSupplierCost(productCost: number, shippingCost: number): number {
  return Math.round((productCost + shippingCost) * 100) / 100;
}

/** Round up to the nearest .99 shelf price (e.g. 22.78 → 22.99). Values already at .99 stay put. */
export function roundToCharmPrice(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.ceil(price + 0.01) - 0.01;
}

function minRetailForMargin(landedCost: number): number {
  if (landedCost <= 0) return roundToCharmPrice(0.01);
  return roundToCharmPrice(landedCost / (1 - MIN_MARGIN_PERCENT / 100));
}

export function calculateRetailPrice(supplierCost: number, trendScore: number): number {
  const trendMultiplier = 1 + Math.min(trendScore, 100) / 200;
  const raw = supplierCost * DEFAULT_MARKUP * trendMultiplier;
  const rounded = roundToCharmPrice(raw);
  const margin = ((rounded - supplierCost) / rounded) * 100;

  if (margin < MIN_MARGIN_PERCENT) {
    return minRetailForMargin(supplierCost);
  }

  return rounded;
}

/**
 * Product markup + shipping at cost (default). Avoids 2.8× on shipping which over-prices cheap items.
 */
export function calculateRetailPriceWithShipping(
  productCost: number,
  shippingCost: number,
  trendScore: number
): number {
  const mode = getShippingPriceMode();

  if (mode === "none") {
    return calculateRetailPrice(productCost, trendScore);
  }

  const shipping = shippingForPricing(shippingCost);

  if (mode === "in_markup") {
    return calculateRetailPrice(landedSupplierCost(productCost, shipping), trendScore);
  }

  const productRetail = calculateRetailPrice(productCost, trendScore);
  const withShipping = productRetail + shipping;
  const landed = landedSupplierCost(productCost, shipping);
  const minRetail = minRetailForMargin(landed);

  return roundToCharmPrice(Math.max(withShipping, minRetail));
}

export function calculateProfit(retailPrice: number, supplierCost: number, quantity = 1): number {
  return (retailPrice - supplierCost) * quantity;
}
