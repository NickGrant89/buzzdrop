/** Trend discovery & catalog automation settings (env-driven). */

const DEFAULT_KEYWORDS = ["phone", "kitchen", "led", "pet", "beauty", "home"];

function parseKeywords(raw: string | undefined): string[] {
  if (!raw?.trim()) return DEFAULT_KEYWORDS;
  const list = raw
    .split(",")
    .map((k) => k.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, ""))
    .filter((k) => k.length >= 2 && k.length <= 40);
  return list.length > 0 ? [...new Set(list)] : DEFAULT_KEYWORDS;
}

export const trendDiscoveryConfig = {
  /** Products to import per CJ sync (max 50 — API rate limits). */
  syncLimit: Math.min(50, Math.max(10, parseInt(process.env.PRODUCT_SYNC_LIMIT ?? "45", 10) || 45)),

  /** Base CJ search keywords (comma-separated). */
  baseKeywords: parseKeywords(process.env.CJ_TRENDING_KEYWORDS),

  /** Cron for product sync — default daily at 03:00. Override with PRODUCT_SYNC_CRON. */
  syncCron: process.env.PRODUCT_SYNC_CRON?.trim() || "0 3 * * *",

  /** Hide products with 0 views & 0 orders after this many days. */
  pruneAfterDays: Math.max(7, parseInt(process.env.CATALOG_PRUNE_DAYS ?? "30", 10) || 30),

  /** Google Trends daily searches (UK by default). */
  googleTrendsEnabled: process.env.GOOGLE_TRENDS_ENABLED !== "false",
  googleTrendsGeo: (process.env.GOOGLE_TRENDS_GEO ?? "GB").toUpperCase(),
  googleTrendsMaxKeywords: Math.min(
    15,
    Math.max(3, parseInt(process.env.GOOGLE_TRENDS_MAX_KEYWORDS ?? "8", 10) || 8)
  ),

  /** TikTok Creative Center hashtag trends (best-effort, may fail without cookies). */
  tiktokTrendsEnabled: process.env.TIKTOK_TRENDS_ENABLED !== "false",
  tiktokTrendsCountry: (process.env.TIKTOK_TRENDS_COUNTRY ?? "GB").toUpperCase(),
  tiktokTrendsMaxKeywords: Math.min(
    15,
    Math.max(3, parseInt(process.env.TIKTOK_TRENDS_MAX_KEYWORDS ?? "8", 10) || 8)
  ),

  /** Cache merged keywords in settings for this many hours. */
  keywordCacheHours: Math.max(1, parseInt(process.env.TREND_KEYWORD_CACHE_HOURS ?? "12", 10) || 12),

  /** Extra trend_score when product title matches a live trend keyword. */
  trendKeywordBoost: Math.min(
    20,
    Math.max(0, parseInt(process.env.TREND_KEYWORD_SCORE_BOOST ?? "10", 10) || 10)
  ),
};
