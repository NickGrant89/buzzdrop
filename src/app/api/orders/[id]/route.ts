import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function sanitizeOrder(order: Record<string, unknown>) {
  return {
    id: order.id as string,
    status: order.status as string,
    total: order.total as number,
    tracking_number: (order.tracking_number as string | null) ?? null,
    created_at: order.created_at as string,
    customer_email: order.customer_email as string,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = db
    .prepare(
      `SELECT oi.product_id, oi.quantity, oi.unit_price, p.title, p.image_url, p.slug FROM order_items oi
       JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`
    )
    .all(id);

  return NextResponse.json({ order: sanitizeOrder(order), items });
}
