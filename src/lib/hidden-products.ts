import { db } from "./db";
import { trendDiscoveryConfig } from "./config/trend-discovery";

export const HiddenReason = {
  CatalogCap: "catalog_cap",
  LowPerformer: "low_performer",
  Demo: "demo",
} as const;

export type HiddenReasonCode = (typeof HiddenReason)[keyof typeof HiddenReason];

export type HiddenProductRow = {
  id: string;
  slug: string;
  title: string;
  retail_price: number;
  trend_score: number;
  view_count: number;
  hidden_reason: string | null;
  updated_at: string;
  supplier_pid: string;
};

export type HiddenProduct = {
  id: string;
  slug: string;
  title: string;
  retailPrice: number;
  trendScore: number;
  views: number;
  reason: string;
  hiddenAt: string;
};

export function getHiddenReasonLabel(code: string | null | undefined): string {
  switch (code) {
    case HiddenReason.CatalogCap:
      return `Catalog cap (max ${trendDiscoveryConfig.catalogMaxActive} active)`;
    case HiddenReason.LowPerformer:
      return `No views or orders after ${trendDiscoveryConfig.pruneAfterDays} days`;
    case HiddenReason.Demo:
      return "Demo product (no CJ supplier)";
    default:
      return "Hidden (reason not recorded)";
  }
}

function inferHiddenReason(row: HiddenProductRow): string {
  if (row.hidden_reason) return getHiddenReasonLabel(row.hidden_reason);
  if (!row.supplier_pid) return getHiddenReasonLabel(HiddenReason.Demo);
  if ((row.view_count ?? 0) === 0) {
    return `Likely low performer (0 views after ${trendDiscoveryConfig.pruneAfterDays}+ days)`;
  }
  return "Likely catalog cap trim";
}

export function getHiddenProductCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM products WHERE is_active = 0")
    .get() as { count: number };
  return row.count;
}

export function getHiddenProducts(limit = 50): HiddenProduct[] {
  const rows = db
    .prepare(
      `SELECT id, slug, title, retail_price, trend_score, view_count, hidden_reason, updated_at, supplier_pid
       FROM products
       WHERE is_active = 0
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .all(limit) as HiddenProductRow[];

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    retailPrice: row.retail_price,
    trendScore: row.trend_score,
    views: row.view_count ?? 0,
    reason: inferHiddenReason(row),
    hiddenAt: row.updated_at,
  }));
}

export function restoreProduct(productId: string): { ok: boolean; message: string } {
  const row = db
    .prepare("SELECT id, is_active, title FROM products WHERE id = ?")
    .get(productId) as { id: string; is_active: number; title: string } | undefined;

  if (!row) {
    return { ok: false, message: "Product not found" };
  }
  if (row.is_active === 1) {
    return { ok: false, message: "Product is already visible on the shop" };
  }

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE products SET is_active = 1, hidden_reason = NULL, updated_at = ? WHERE id = ?"
  ).run(now, productId);

  return { ok: true, message: `Restored "${row.title}" to the shop` };
}
