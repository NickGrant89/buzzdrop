import { getProductById } from "./products";
import { listCjShippingQuotes, type ShippingQuoteOption } from "./suppliers/cj/shipping";
import { cjShippingEstimatePostcode } from "./config";

export const MANUAL_SHIP_COUNTRIES = [
  { code: "GB", label: "United Kingdom", postcodeLabel: "Postcode", postcodePlaceholder: "SW1A 1AA" },
  { code: "US", label: "United States", postcodeLabel: "ZIP code", postcodePlaceholder: "75001" },
  { code: "CA", label: "Canada", postcodeLabel: "Postal code", postcodePlaceholder: "M5H 2N2" },
  { code: "AU", label: "Australia", postcodeLabel: "Postcode", postcodePlaceholder: "2000" },
  { code: "IE", label: "Ireland", postcodeLabel: "Eircode", postcodePlaceholder: "D02 X285" },
  { code: "DE", label: "Germany", postcodeLabel: "Postcode", postcodePlaceholder: "10115" },
  { code: "FR", label: "France", postcodeLabel: "Postcode", postcodePlaceholder: "75001" },
] as const;

export type ManualShippingQuote = {
  productId: string;
  productTitle: string;
  quantity: number;
  productUnitPriceGbp: number;
  productSubtotalGbp: number;
  destCountryCode: string;
  destPostcode: string;
  options: Array<
    ShippingQuoteOption & {
      totalGbp: number;
      id: string;
    }
  >;
};

export async function quoteManualOrderShipping(input: {
  productId: string;
  quantity?: number;
  destCountryCode?: string;
  destPostcode?: string;
}): Promise<ManualShippingQuote> {
  const product = getProductById(input.productId.trim());
  if (!product || !product.is_active) {
    throw new Error("Product not found or inactive");
  }
  if (!product.supplier_vid) {
    throw new Error("Product has no CJ variant ID — cannot quote shipping");
  }

  const quantity = Math.min(10, Math.max(1, Math.floor(input.quantity ?? 1)));
  const destCountryCode = (input.destCountryCode ?? "GB").trim().toUpperCase();
  const destPostcode =
    input.destPostcode?.trim() ||
    (destCountryCode === "GB" ? cjShippingEstimatePostcode() : "");

  const rawOptions = await listCjShippingQuotes(
    [{ vid: product.supplier_vid, quantity }],
    destCountryCode,
    destPostcode || undefined
  );

  if (rawOptions.length === 0) {
    throw new Error(
      `No CJ shipping methods found to ${destCountryCode}. Try a different country or check the product supports international delivery.`
    );
  }

  const productSubtotalGbp = Math.round(product.retail_price * quantity * 100) / 100;

  return {
    productId: product.id,
    productTitle: product.title,
    quantity,
    productUnitPriceGbp: product.retail_price,
    productSubtotalGbp,
    destCountryCode,
    destPostcode,
    options: rawOptions.map((option, index) => ({
      ...option,
      id: `${option.fromCountryCode}-${index}`,
      totalGbp: Math.round((productSubtotalGbp + option.shippingCostGbp) * 100) / 100,
    })),
  };
}

export function formatShippingNote(quote: ManualShippingQuote, optionId: string): string {
  const option = quote.options.find((o) => o.id === optionId);
  if (!option) return "";

  const country = MANUAL_SHIP_COUNTRIES.find((c) => c.code === quote.destCountryCode)?.label
    ?? quote.destCountryCode;

  return [
    `Ship to: ${country}${quote.destPostcode ? ` (${quote.destPostcode})` : ""}`,
    `CJ method: ${option.logisticName}`,
    `From warehouse: ${option.fromCountryCode}`,
    `Delivery: ${option.deliveryEstimate}`,
    `Product: ${quote.quantity}x ${quote.productTitle} — ${quote.productSubtotalGbp.toFixed(2)} GBP`,
    `Shipping: ${option.shippingCostGbp.toFixed(2)} GBP`,
  ].join("\n");
}
