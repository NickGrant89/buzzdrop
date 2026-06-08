import { storeConfig } from "./config";

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(storeConfig.locale, {
    style: "currency",
    currency: storeConfig.currency,
  }).format(amount);
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function parseUkAddress(full: string): {
  line1: string;
  city: string;
  postcode: string;
} {
  const parts = full.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return {
      line1: parts[0],
      city: parts[parts.length - 2],
      postcode: parts[parts.length - 1],
    };
  }
  return { line1: full, city: "London", postcode: "SW1A 1AA" };
}
