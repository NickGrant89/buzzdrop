import { getHeroProducts, syncHeroProductPins } from "../hero-products";
import { getProductDisplayPrice } from "../automation/pricing";
import { getSiteUrl } from "../seo";
import { formatPrice } from "../utils";
import { buildTikTokManualPost } from "./tiktok-content";
import { videoFileExists, videoFilePath } from "./videos";

export type MarketingExportProduct = {
  id: string;
  slug: string;
  title: string;
  priceGbp: number;
  priceLabel: string;
  productUrl: string;
  productUrlTracked: string;
  videoUrl: string | null;
  videoFilename: string;
  videoAvailable: boolean;
  caption: string;
  hashtags: string;
  pinComment: string;
  hooks: Array<{ label: string; openingText: string; shotNotes: string }>;
  topicSlug: string;
  youtubeTitle: string;
  youtubeDescription: string;
  tags: string[];
};

export type MarketingExport = {
  generatedAt: string;
  siteUrl: string;
  products: MarketingExportProduct[];
};

function trackedProductUrl(productUrl: string, slug: string, source = "youtube"): string {
  const url = new URL(productUrl);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "shorts");
  url.searchParams.set("utm_campaign", slug.slice(0, 48));
  url.searchParams.set("utm_content", `buzzdrop-${slug}`.slice(0, 64));
  return url.toString();
}

function videoPublicUrl(slug: string): {
  videoUrl: string | null;
  videoFilename: string;
  videoAvailable: boolean;
} {
  const filename = `${slug}-ad.mp4`;
  const available = videoFileExists(slug);
  return {
    videoAvailable: available,
    videoFilename: filename,
    videoUrl: available ? `${getSiteUrl()}/social/videos/${filename}` : null,
  };
}

function parseHashtagTags(hashtags: string): string[] {
  return hashtags
    .split(/\s+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 15);
}

export function getMarketingExport(limit = 6): MarketingExport {
  syncHeroProductPins();
  const heroes = getHeroProducts(limit);
  const siteUrl = getSiteUrl();

  const products: MarketingExportProduct[] = heroes.map((h, index) => {
    const displayPrice = getProductDisplayPrice(h.product);
    const post = buildTikTokManualPost(h.product, index + 1);
    const { videoUrl, videoFilename, videoAvailable } = videoPublicUrl(h.product.slug);
    const primaryHook = post.hooks[0]?.openingText ?? post.title;
    const topicSlug = `buzzdrop-${h.product.slug}`;

    const youtubeDescription = [
      post.caption,
      "",
      `Shop → ${trackedProductUrl(post.productUrl, h.product.slug)}`,
      "",
      post.hashtags,
      "",
      "#Shorts #YouTubeShorts #buzzdrop #ukshopping",
    ].join("\n");

    return {
      id: h.product.id,
      slug: h.product.slug,
      title: h.product.title,
      priceGbp: displayPrice,
      priceLabel: formatPrice(displayPrice),
      productUrl: post.productUrl,
      productUrlTracked: trackedProductUrl(post.productUrl, h.product.slug),
      videoUrl,
      videoFilename,
      videoAvailable,
      caption: post.caption,
      hashtags: post.hashtags,
      pinComment: post.pinComment,
      hooks: post.hooks,
      topicSlug,
      youtubeTitle: `${primaryHook} · ${post.priceLabel} · Free UK delivery`.slice(0, 100),
      youtubeDescription,
      tags: [
        "buzzdrop",
        "ukshopping",
        "viral",
        "gadgets",
        "freedelivery",
        ...parseHashtagTags(post.hashtags),
      ].slice(0, 15),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    siteUrl,
    products,
  };
}
