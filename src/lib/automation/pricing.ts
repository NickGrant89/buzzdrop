const DEFAULT_MARKUP = 2.8;
const MIN_MARGIN_PERCENT = 55;

export function landedSupplierCost(productCost: number, shippingCost: number): number {
  return Math.round((productCost + shippingCost) * 100) / 100;
}

export function calculateRetailPrice(supplierCost: number, trendScore: number): number {
  const trendMultiplier = 1 + Math.min(trendScore, 100) / 200;
  const raw = supplierCost * DEFAULT_MARKUP * trendMultiplier;
  const rounded = Math.ceil(raw) - 0.01;
  const margin = ((rounded - supplierCost) / rounded) * 100;

  if (margin < MIN_MARGIN_PERCENT) {
    return Math.ceil(supplierCost / (1 - MIN_MARGIN_PERCENT / 100)) - 0.01;
  }

  return rounded;
}

export function calculateProfit(retailPrice: number, supplierCost: number, quantity = 1): number {
  return (retailPrice - supplierCost) * quantity;
}
