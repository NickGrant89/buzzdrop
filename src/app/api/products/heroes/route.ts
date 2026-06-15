import { NextResponse } from "next/server";
import { getHeroProducts, syncHeroProductPins } from "@/lib/hero-products";

export async function GET() {
  syncHeroProductPins();
  const heroes = getHeroProducts(3);

  return NextResponse.json({
    heroes: heroes.map((h) => ({
      id: h.product.id,
      slug: h.product.slug,
      title: h.product.title,
      category: h.product.category,
      retail_price: h.product.retail_price,
      supplier_cost: h.product.supplier_cost,
      image_url: h.product.image_url,
      trend_score: h.product.trend_score,
      view_count: h.product.view_count ?? 0,
      score: h.score,
      pinned: Boolean(h.product.is_pinned),
      margin_gbp: h.marginGbp,
      reasons: h.reasons,
    })),
  });
}
