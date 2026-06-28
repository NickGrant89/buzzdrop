import type { Product } from "@/lib/db";
import { getProductDisplayPrice } from "@/lib/automation/pricing";
import { formatCategoryDisplay } from "@/lib/categories";
import { getSiteUrl } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";

export type MarketingPostPayload = {
  title: string;
  caption: string;
  hashtags: string;
  productUrl: string;
  imageUrl: string;
  priceLabel: string;
  category: string;
};

function categoryHashtag(category: string): string {
  return (
    "#" +
    category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24)
  );
}

export function buildMarketingPost(product: Product): MarketingPostPayload {
  const siteUrl = getSiteUrl();
  const productUrl = `${siteUrl}/product/${product.slug}`;
  const category = formatCategoryDisplay(product.category);
  const priceLabel = formatPrice(getProductDisplayPrice(product));
  const hashtags = [
    categoryHashtag(category),
    "#ukshopping",
    "#viralfinds",
    "#buzzdrop",
    "#freedelivery",
  ].join(" ");

  const caption = [
    `🔥 ${product.title}`,
    "",
    product.description,
    "",
    `Only ${priceLabel} · Free UK delivery 🇬🇧`,
    "",
    `👉 ${productUrl}`,
    "",
    hashtags,
  ].join("\n");

  return {
    title: product.title,
    caption,
    hashtags,
    productUrl,
    imageUrl: product.image_url,
    priceLabel,
    category,
  };
}
