import { cjAuthenticatedFetch } from "./client";
import { cjConfig } from "@/lib/config";

type FreightOption = {
  logisticName?: string;
  logisticPrice?: number;
  logisticAging?: string;
};

export type ResolvedShipping = {
  logisticName: string;
  fromCountryCode: string;
};

export async function resolveShipping(
  items: Array<{ vid: string; quantity: number }>,
  destCountryCode = "GB",
  postcode?: string
): Promise<ResolvedShipping> {
  const override = process.env.CJ_LOGISTIC_NAME?.trim();
  if (override) {
    return {
      logisticName: override,
      fromCountryCode: process.env.CJ_FROM_COUNTRY_CODE ?? "CN",
    };
  }

  // Most CJ catalog items ship from CN; GB warehouse is less common.
  const origins = ["CN", cjConfig.fromCountryCode, "US"].filter(
    (code, index, all) => code && all.indexOf(code) === index
  );

  let lastError = "No shipping methods returned";

  for (const startCountryCode of origins) {
    try {
      const res = await cjAuthenticatedFetch<FreightOption[]>("/logistic/freightCalculate", {
        method: "POST",
        body: JSON.stringify({
          startCountryCode,
          endCountryCode: destCountryCode,
          zip: postcode?.replace(/\s/g, ""),
          products: items.map((item) => ({
            vid: item.vid,
            quantity: item.quantity,
          })),
        }),
      });

      const options = (res.data ?? []).filter((o) => o.logisticName?.trim());
      if (options.length === 0) continue;

      options.sort((a, b) => (a.logisticPrice ?? 9999) - (b.logisticPrice ?? 9999));
      return {
        logisticName: options[0].logisticName!.trim(),
        fromCountryCode: startCountryCode,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(`Could not find shipping method to ${destCountryCode}: ${lastError}`);
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
