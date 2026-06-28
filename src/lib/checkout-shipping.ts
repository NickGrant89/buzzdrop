import { getProductById } from "./products";
import { listCjShippingQuotes } from "./suppliers/cj/shipping";
import { MANUAL_SHIP_COUNTRIES } from "./manual-shipping";
import { countryLabel } from "./ship-countries";

export { MANUAL_SHIP_COUNTRIES, countryLabel };

export type CartShippingQuote = {
  destCountryCode: string;
  destCountryLabel: string;
  shippingCostGbp: number;
  deliveryEstimate: string;
  logisticName: string;
  subtotalGbp: number;
  totalGbp: number;
};

export async function quoteCartShipping(input: {
  items: Array<{ productId: string; quantity: number }>;
  destCountryCode: string;
  destPostcode: string;
  subtotalGbp: number;
}): Promise<CartShippingQuote> {
  const destCountryCode = input.destCountryCode.trim().toUpperCase();
  const destPostcode = input.destPostcode.trim();

  if (!MANUAL_SHIP_COUNTRIES.some((c) => c.code === destCountryCode)) {
    throw new Error("We do not ship to that country yet — choose another from the list");
  }

  if (destCountryCode === "GB") {
    return {
      destCountryCode,
      destCountryLabel: countryLabel(destCountryCode),
      shippingCostGbp: 0,
      deliveryEstimate: "7–10 working days",
      logisticName: "Standard UK",
      subtotalGbp: input.subtotalGbp,
      totalGbp: input.subtotalGbp,
    };
  }

  const cjItems: Array<{ vid: string; quantity: number }> = [];
  for (const item of input.items) {
    const product = getProductById(item.productId);
    if (!product || !product.is_active) {
      throw new Error("A product in your cart is no longer available");
    }
    if (!product.supplier_vid) {
      throw new Error(`${product.title} cannot ship internationally yet`);
    }
    cjItems.push({ vid: product.supplier_vid, quantity: item.quantity });
  }

  const quotes = await listCjShippingQuotes(
    cjItems,
    destCountryCode,
    destPostcode || undefined
  );

  if (quotes.length === 0) {
    throw new Error(
      `No shipping method found to ${countryLabel(destCountryCode)}. Try a different postcode or contact ${"support@buzzdrop.co.uk"}.`
    );
  }

  const best = quotes[0];
  const shippingCostGbp = Math.round(best.shippingCostGbp * 100) / 100;

  return {
    destCountryCode,
    destCountryLabel: countryLabel(destCountryCode),
    shippingCostGbp,
    deliveryEstimate: best.deliveryEstimate,
    logisticName: best.logisticName,
    subtotalGbp: input.subtotalGbp,
    totalGbp: Math.round((input.subtotalGbp + shippingCostGbp) * 100) / 100,
  };
}
