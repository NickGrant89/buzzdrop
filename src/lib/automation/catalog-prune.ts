import { db } from "@/lib/db";
import { trendDiscoveryConfig } from "@/lib/config/trend-discovery";
import { logAutomation } from "./logger";

/** Deactivate CJ products with zero views and zero orders after N days. */
export function pruneLowPerformingProducts(): { pruned: number } {
  const days = trendDiscoveryConfig.pruneAfterDays;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `UPDATE products SET is_active = 0, updated_at = ?
       WHERE is_active = 1
         AND supplier_pid != ''
         AND created_at < ?
         AND COALESCE(view_count, 0) = 0
         AND id NOT IN (
           SELECT DISTINCT oi.product_id FROM order_items oi
           INNER JOIN orders o ON o.id = oi.order_id
           WHERE o.status IN ('paid', 'fulfilled', 'shipped')
         )`
    )
    .run(now, cutoff);

  return { pruned: result.changes };
}

export async function pruneLowPerformingProductsWithLog(): Promise<{ pruned: number }> {
  const result = pruneLowPerformingProducts();
  if (result.pruned > 0) {
    await logAutomation(
      "catalog_prune",
      "success",
      `Hidden ${result.pruned} low performers (0 views/orders after ${trendDiscoveryConfig.pruneAfterDays} days)`
    );
  }
  return result;
}
