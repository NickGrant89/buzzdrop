export const storeConfig = {
  currency: (process.env.STORE_CURRENCY ?? "GBP") as "GBP" | "USD",
  locale: process.env.STORE_LOCALE ?? "en-GB",
  countryCode: process.env.STORE_COUNTRY_CODE ?? "GB",
  usdToGbp: parseFloat(process.env.USD_TO_GBP ?? "0.79"),
};

export const cjConfig = {
  apiKey: process.env.CJ_API_KEY ?? "",
  email: process.env.CJ_EMAIL ?? "",
  password: process.env.CJ_PASSWORD ?? "",
  fromCountryCode: process.env.CJ_FROM_COUNTRY_CODE ?? "GB",
  countryCode: process.env.CJ_COUNTRY_CODE ?? "GB",
  /** 2 = balance payment (auto), 3 = create only (pay in CJ dashboard) */
  payType: parseInt(process.env.CJ_PAY_TYPE ?? "3", 10),
  platform: process.env.CJ_PLATFORM ?? "shopify",
  /** 1=platform (needs storageId), 2=seller/CJ standard (default), 3=platform CJ-assigned warehouse */
  shopLogisticsType: parseInt(process.env.CJ_SHOP_LOGISTICS_TYPE ?? "2", 10),
  baseUrl: "https://developers.cjdropshipping.com/api2.0/v1",
};

export function isCjConfigured(): boolean {
  if (cjConfig.apiKey.length > 10) return true;
  return cjConfig.email.includes("@") && cjConfig.password.length >= 6;
}

export function usdToStoreCurrency(usd: number): number {
  if (storeConfig.currency === "GBP") {
    return Math.round(usd * storeConfig.usdToGbp * 100) / 100;
  }
  return usd;
}

/** Fallback UK shipping estimate when CJ freight API is unavailable (GBP). */
export function defaultCjShippingEstimate(): number {
  return parseFloat(process.env.CJ_DEFAULT_SHIPPING_GBP ?? "5.99");
}

/** UK postcode used when estimating CJ freight during product sync. */
export function cjShippingEstimatePostcode(): string {
  return (process.env.CJ_SHIPPING_ESTIMATE_POSTCODE ?? "SW1A1AA").replace(/\s/g, "");
}
