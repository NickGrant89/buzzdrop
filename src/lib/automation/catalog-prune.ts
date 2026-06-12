import { db } from "@/lib/db";
import { trendDiscoveryConfig } from "@/lib/config/trend-discovery";
import { logAutomation } from "./logger";
import { syncHeroProductPins } from "@/lib/hero-products";

const ORDERED_PRODUCT_SUBQUERY = `
  SELECT DISTINCT oi.product_id FROM order_items oi
  INNER JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN ('paid', 'fulfilled', 'shipped')
`;

/** Deactivate CJ products with zero views and zero orders after N days. */
export function pruneLowPerformingProducts(): { pruned: number } {
  syncHeroProductPins();

  const days = trendDiscoveryConfig.pruneAfterDays;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `UPDATE products SET is_active = 0, updated_at = ?
       WHERE is_active = 1
         AND is_pinned = 0
         AND supplier_pid != ''
         AND created_at < ?
         AND COALESCE(view_count, 0) = 0
         AND id NOT IN (${ORDERED_PRODUCT_SUBQUERY})`
    )
    .run(now, cutoff);

  return { pruned: result.changes };
}

/** Hide lowest-performing products when the catalog exceeds CATALOG_MAX_ACTIVE. */
export function trimExcessCatalogProducts(): { trimmed: number } {
  syncHeroProductPins();

  const max = trendDiscoveryConfig.catalogMaxActive;
  const now = new Date().toISOString();
  let trimmed = 0;

  while (true) {
    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM products WHERE is_active = 1")
      .get() as { count: number };
    if (count <= max) break;

    const victim = db
      .prepare(
        `SELECT id FROM products
         WHERE is_active = 1
           AND is_pinned = 0
           AND supplier_pid != ''
           AND id NOT IN (${ORDERED_PRODUCT_SUBQUERY})
         ORDER BY trend_score ASC, COALESCE(view_count, 0) ASC, created_at ASC
         LIMIT 1`
      )
      .get() as { id: string } | undefined;

    if (!victim) break;

    db.prepare("UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?").run(
      now,
      victim.id
    );
    trimmed++;
  }

  return { trimmed };
}

export async function trimExcessCatalogProductsWithLog(): Promise<{ trimmed: number }> {
  const result = trimExcessCatalogProducts();
  if (result.trimmed > 0) {
    await logAutomation(
      "catalog_trim",
      "success",
      `Hidden ${result.trimmed} excess products (cap ${trendDiscoveryConfig.catalogMaxActive} active)`
    );
  }
  return result;
}

export async function pruneLowPerformingProductsWithLog(): Promise<{ pruned: number; trimmed: number }> {
  const result = pruneLowPerformingProducts();
  const { trimmed } = await trimExcessCatalogProductsWithLog();
  if (result.pruned > 0) {
    await logAutomation(
      "catalog_prune",
      "success",
      `Hidden ${result.pruned} low performers (0 views/orders after ${trendDiscoveryConfig.pruneAfterDays} days)`
    );
  }
  return { pruned: result.pruned, trimmed };
}
