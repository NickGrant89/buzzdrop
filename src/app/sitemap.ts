import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const productUrls = getActiveProducts().map((product) => ({
    url: `${base}/product/${product.slug}`,
    lastModified: new Date(product.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/returns`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    ...productUrls,
  ];
}
