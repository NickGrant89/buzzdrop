import { db } from "@/lib/db";

export function recordProductView(productId: string): boolean {
  if (!productId) return false;
  const result = db
    .prepare(
      `UPDATE products SET view_count = COALESCE(view_count, 0) + 1, updated_at = ? WHERE id = ? AND is_active = 1`
    )
    .run(new Date().toISOString(), productId);
  return result.changes > 0;
}
