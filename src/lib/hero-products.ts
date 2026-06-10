import { db, type Product } from "@/lib/db";

export type HeroProduct = {
  product: Product;
  score: number;
  marginGbp: number;
  marginPercent: number;
  reasons: string[];
};

const HERO_PRICE_MIN = parseFloat(process.env.HERO_PRICE_MIN_GBP ?? "15");
const HERO_PRICE_MAX = parseFloat(process.env.HERO_PRICE_MAX_GBP ?? "45");
const HERO_MIN_MARGIN_GBP = parseFloat(process.env.HERO_MIN_MARGIN_GBP ?? "4");

function marginMetrics(product: Product) {
  const marginGbp = Math.round((product.retail_price - product.supplier_cost) * 100) / 100;
  const marginPercent =
    product.retail_price > 0
      ? Math.round((marginGbp / product.retail_price) * 1000) / 10
      : 0;
  return { marginGbp, marginPercent };
}

function scoreProduct(product: Product): HeroProduct {
  const { marginGbp, marginPercent } = marginMetrics(product);
  const reasons: string[] = [];
  let score = 0;

  // Trend / viral signal (0–40)
  const trendPart = Math.min(product.trend_score, 99) * 0.4;
  score += trendPart;
  if (product.trend_score >= 85) reasons.push("High trend score");

  // Margin (0–35)
  const marginPart = Math.min(Math.max(marginGbp, 0) * 4, 35);
  score += marginPart;
  if (marginGbp >= HERO_MIN_MARGIN_GBP) reasons.push(`£${marginGbp.toFixed(2)} margin`);

  // Ideal ad price band £15–£45 (0–20)
  if (product.retail_price >= HERO_PRICE_MIN && product.retail_price <= HERO_PRICE_MAX) {
    score += 20;
    reasons.push("Ideal ad price band");
  } else if (product.retail_price >= 10 && product.retail_price <= 55) {
    score += 8;
  }

  // Social proof from shop views (0–10)
  const views = product.view_count ?? 0;
  if (views > 0) {
    score += Math.min(Math.log10(views + 1) * 5, 10);
    if (views >= 5) reasons.push(`${views} page views`);
  }

  // Penalise weak images
  if (product.image_url.includes("placeholder")) {
    score -= 25;
  }

  if (product.stock <= 0) {
    score -= 50;
  }

  if (reasons.length === 0) reasons.push("Strong overall score");

  return {
    product,
    score: Math.round(score * 10) / 10,
    marginGbp,
    marginPercent,
    reasons,
  };
}

/** Pick up to 3 hero products — diverse categories, best for ads & short-form video. */
export function getHeroProducts(limit = 3): HeroProduct[] {
  const products = db
    .prepare(
      `SELECT * FROM products
       WHERE is_active = 1 AND supplier_pid != '' AND stock > 0
       ORDER BY trend_score DESC`
    )
    .all() as Product[];

  const ranked = products
    .map(scoreProduct)
    .filter((h) => h.score > 0 && h.marginGbp >= 2)
    .sort((a, b) => b.score - a.score);

  const picked: HeroProduct[] = [];
  const usedCategories = new Set<string>();

  for (const hero of ranked) {
    if (picked.length >= limit) break;
    const cat = hero.product.category.toLowerCase();
    if (picked.length < limit - 1 && usedCategories.has(cat) && ranked.length > limit * 2) {
      continue;
    }
    picked.push(hero);
    usedCategories.add(cat);
  }

  // Fill remaining slots if category diversity left gaps
  if (picked.length < limit) {
    for (const hero of ranked) {
      if (picked.length >= limit) break;
      if (picked.some((p) => p.product.id === hero.product.id)) continue;
      picked.push(hero);
    }
  }

  return picked.slice(0, limit);
}
