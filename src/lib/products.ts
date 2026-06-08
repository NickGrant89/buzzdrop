import { db, type Product } from "./db";

export function getActiveProducts(limit?: number): Product[] {
  const sql = limit
    ? "SELECT * FROM products WHERE is_active = 1 ORDER BY trend_score DESC LIMIT ?"
    : "SELECT * FROM products WHERE is_active = 1 ORDER BY trend_score DESC";
  return (limit ? db.prepare(sql).all(limit) : db.prepare(sql).all()) as Product[];
}

export function getProductBySlug(slug: string): Product | undefined {
  return db.prepare("SELECT * FROM products WHERE slug = ? AND is_active = 1").get(slug) as
    | Product
    | undefined;
}

export function getProductById(id: string): Product | undefined {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;
}

export function getCategories(): string[] {
  const rows = db
    .prepare("SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category")
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function getStoreStats() {
  const products = db.prepare("SELECT COUNT(*) as count FROM products WHERE is_active = 1").get() as {
    count: number;
  };
  const orders = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
  const revenue = db
    .prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != 'failed'")
    .get() as { total: number };
  const profit = db
    .prepare(
      `SELECT COALESCE(SUM((oi.unit_price - oi.supplier_cost) * oi.quantity), 0) as profit
       FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status != 'failed'`
    )
    .get() as { profit: number };

  return {
    productCount: products.count,
    orderCount: orders.count,
    revenue: revenue.total,
    profit: profit.profit,
  };
}
