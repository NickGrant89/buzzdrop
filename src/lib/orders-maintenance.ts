import { db } from "./db";
import { logAutomation } from "./automation/logger";

/** Remove unpaid demo/test checkout orders (status = pending). */
export function deletePendingOrders(): { deleted: number } {
  const pending = db
    .prepare(
      `SELECT id FROM orders
       WHERE status = 'pending' AND COALESCE(order_kind, 'standard') = 'standard'`
    )
    .all() as { id: string }[];

  if (pending.length === 0) {
    return { deleted: 0 };
  }

  const deleteItems = db.prepare("DELETE FROM order_items WHERE order_id = ?");
  const deleteOrder = db.prepare("DELETE FROM orders WHERE id = ?");

  const transaction = db.transaction(() => {
    for (const { id } of pending) {
      deleteItems.run(id);
      deleteOrder.run(id);
    }
  });

  transaction();

  return { deleted: pending.length };
}

export async function deletePendingOrdersWithLog(): Promise<{ deleted: number }> {
  const result = deletePendingOrders();
  if (result.deleted > 0) {
    await logAutomation(
      "order_cleanup",
      "success",
      `Removed ${result.deleted} pending demo/unpaid order(s)`
    );
  }
  return result;
}
