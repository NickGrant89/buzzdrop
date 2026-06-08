import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = db
    .prepare(
      `SELECT oi.*, p.title, p.image_url, p.slug FROM order_items oi
       JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`
    )
    .all(id);

  return NextResponse.json({ order, items });
}
