import type { MetadataRoute } from "next";
import { getActiveProducts, getCategories } from "@/lib/products";
import { categorySlug, getShopCategories } from "@/lib/categories";
import { getSiteUrl } from "@/lib/seo";

/** Build-time DB is empty on Railway — must generate at request time. */
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const productUrls = getActiveProducts().map((product) => ({
    url: `${base}/product/${product.slug}`,
    lastModified: new Date(product.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryUrls = getShopCategories(getCategories()).map((label) => ({
    url: `${base}/category/${categorySlug(label)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/returns`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    ...categoryUrls,
    ...productUrls,
  ];
}
