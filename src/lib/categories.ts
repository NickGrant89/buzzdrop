/** Turn raw CJ category breadcrumbs into short, shopper-friendly labels. */
import { normalizeStoreCategory } from "./product-normalize";

export function formatCategoryDisplay(raw: string): string {
  return normalizeStoreCategory(raw);
}

export function categorySlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getShopCategories(rawCategories: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawCategories) {
    const display = formatCategoryDisplay(raw);
    if (!seen.has(display)) {
      seen.add(display);
      result.push(display);
    }
  }

  return result.sort((a, b) => a.localeCompare(b));
}

export function productMatchesCategory(rawCategory: string, filterLabel: string): boolean {
  return formatCategoryDisplay(rawCategory) === filterLabel;
}
