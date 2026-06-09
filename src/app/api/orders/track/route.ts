import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const trackSchema = z.object({
  order_id: z.string().uuid(),
  email: z.string().email(),
});

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

export async function POST(request: Request) {
  try {
    const body = trackSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(body.order_id) as
      | Record<string, unknown>
      | undefined;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderEmail = String(order.customer_email ?? "").trim().toLowerCase();
    if (orderEmail !== email) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = db
      .prepare(
        `SELECT oi.quantity, oi.unit_price, p.title, p.image_url, p.slug
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`
      )
      .all(body.order_id);

    return NextResponse.json({
      order: sanitizeOrder(order),
      items,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid email and order number" }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not look up order" }, { status: 500 });
  }
}
