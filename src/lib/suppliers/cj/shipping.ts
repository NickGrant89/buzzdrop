import { cjAuthenticatedFetch } from "./client";
import {
  cjConfig,
  cjShippingEstimatePostcode,
  defaultCjShippingEstimate,
  usdToStoreCurrency,
} from "@/lib/config";

type FreightOption = {
  logisticName?: string;
  logisticPrice?: number;
  logisticAging?: string;
};

export type ResolvedShipping = {
  logisticName: string;
  fromCountryCode: string;
};

export type ShippingEstimate = ResolvedShipping & {
  shippingCost: number;
};

function shippingOrigins(): string[] {
  return [cjConfig.fromCountryCode, "CN", "US"].filter(
    (code, index, all) => code && all.indexOf(code) === index
  );
}

async function fetchFreightOptions(
  items: Array<{ vid: string; quantity: number }>,
  destCountryCode: string,
  postcode?: string
): Promise<Array<FreightOption & { fromCountryCode: string }>> {
  const zip = postcode?.replace(/\s/g, "") || undefined;
  const allOptions: Array<FreightOption & { fromCountryCode: string }> = [];

  for (const startCountryCode of shippingOrigins()) {
    try {
      const res = await cjAuthenticatedFetch<FreightOption[]>("/logistic/freightCalculate", {
        method: "POST",
        body: JSON.stringify({
          startCountryCode,
          endCountryCode: destCountryCode,
          zip,
          products: items.map((item) => ({
            vid: item.vid,
            quantity: item.quantity,
          })),
        }),
      });

      for (const option of res.data ?? []) {
        if (!option.logisticName?.trim()) continue;
        allOptions.push({ ...option, fromCountryCode: startCountryCode });
      }
    } catch {
      /* try next origin */
    }
  }

  return allOptions;
}

function pickCheapestOption(
  options: Array<FreightOption & { fromCountryCode: string }>
): (FreightOption & { fromCountryCode: string }) | null {
  if (options.length === 0) return null;

  return [...options].sort(
    (a, b) => (a.logisticPrice ?? 9999) - (b.logisticPrice ?? 9999)
  )[0];
}

function toShippingQuote(
  option: FreightOption & { fromCountryCode: string }
): ShippingQuoteOption {
  const shippingUsd = option.logisticPrice ?? 0;
  return {
    logisticName: option.logisticName!.trim(),
    fromCountryCode: option.fromCountryCode,
    shippingCostGbp:
      shippingUsd > 0 ? usdToStoreCurrency(shippingUsd) : defaultCjShippingEstimate(),
    deliveryEstimate: option.logisticAging?.trim() || "—",
  };
}

export type ShippingQuoteOption = {
  logisticName: string;
  fromCountryCode: string;
  shippingCostGbp: number;
  deliveryEstimate: string;
};

export async function listCjShippingQuotes(
  items: Array<{ vid: string; quantity: number }>,
  destCountryCode = "GB",
  postcode?: string
): Promise<ShippingQuoteOption[]> {
  if (items.length === 0 || !items[0]?.vid) return [];

  const override = process.env.CJ_LOGISTIC_NAME?.trim();
  if (override) {
    return [
      {
        logisticName: override,
        fromCountryCode: process.env.CJ_FROM_COUNTRY_CODE ?? cjConfig.fromCountryCode,
        shippingCostGbp: defaultCjShippingEstimate(),
        deliveryEstimate: "Configured method",
      },
    ];
  }

  const options = await fetchFreightOptions(items, destCountryCode, postcode);
  const unique = new Map<string, ShippingQuoteOption>();

  for (const option of options) {
    if (!option.logisticName?.trim()) continue;
    const quote = toShippingQuote(option);
    const key = `${quote.fromCountryCode}:${quote.logisticName}`;
    const existing = unique.get(key);
    if (!existing || quote.shippingCostGbp < existing.shippingCostGbp) {
      unique.set(key, quote);
    }
  }

  return [...unique.values()].sort((a, b) => a.shippingCostGbp - b.shippingCostGbp);
}

export async function estimateCjShipping(
  items: Array<{ vid: string; quantity: number }>,
  destCountryCode = "GB",
  postcode = cjShippingEstimatePostcode()
): Promise<ShippingEstimate | null> {
  if (items.length === 0 || !items[0]?.vid) return null;

  const override = process.env.CJ_LOGISTIC_NAME?.trim();
  if (override) {
    return {
      logisticName: override,
      fromCountryCode: process.env.CJ_FROM_COUNTRY_CODE ?? cjConfig.fromCountryCode,
      shippingCost: defaultCjShippingEstimate(),
    };
  }

  const options = await fetchFreightOptions(items, destCountryCode, postcode);
  const cheapest = pickCheapestOption(options);
  if (!cheapest?.logisticName) return null;

  const shippingUsd = cheapest.logisticPrice ?? 0;
  return {
    logisticName: cheapest.logisticName.trim(),
    fromCountryCode: cheapest.fromCountryCode,
    shippingCost: shippingUsd > 0 ? usdToStoreCurrency(shippingUsd) : defaultCjShippingEstimate(),
  };
}

export async function resolveShipping(
  items: Array<{ vid: string; quantity: number }>,
  destCountryCode = "GB",
  postcode?: string
): Promise<ResolvedShipping> {
  const override = process.env.CJ_LOGISTIC_NAME?.trim();
  if (override) {
    return {
      logisticName: override,
      fromCountryCode: process.env.CJ_FROM_COUNTRY_CODE ?? cjConfig.fromCountryCode,
    };
  }

  const options = await fetchFreightOptions(items, destCountryCode, postcode);
  const cheapest = pickCheapestOption(options);
  if (!cheapest?.logisticName) {
    throw new Error(`Could not find shipping method to ${destCountryCode}`);
  }

  return {
    logisticName: cheapest.logisticName.trim(),
    fromCountryCode: cheapest.fromCountryCode,
  };
}

/** @deprecated use resolveShipping */
export async function resolveLogisticName(
  items: Array<{ vid: string; quantity: number }>,
  destCountryCode = "GB",
  postcode?: string
): Promise<string> {
  const resolved = await resolveShipping(items, destCountryCode, postcode);
  return resolved.logisticName;
}
