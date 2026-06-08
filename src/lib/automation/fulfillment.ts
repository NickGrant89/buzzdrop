import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { logAutomation } from "./logger";
import { isCjConfigured } from "../config";
import { createCjOrder, getCjOrderTracking, type UkShippingAddress } from "../suppliers/cj/orders";
import { parseUkAddress } from "../utils";

export async function fulfillPendingOrders(): Promise<number> {
  const pendingOrders = db
    .prepare("SELECT * FROM orders WHERE status = 'paid' ORDER BY created_at ASC")
    .all() as Array<{
    id: string;
    customer_name: string;
    customer_email: string;
    shipping_address: string;
    shipping_line1: string;
    shipping_line2: string;
    shipping_city: string;
    shipping_county: string;
    shipping_postcode: string;
    shipping_phone: string;
  }>;

  if (pendingOrders.length === 0) return 0;

  let fulfilled = 0;

  for (const order of pendingOrders) {
    try {
      const items = db
        .prepare(
          `SELECT oi.*, p.supplier_vid, p.supplier_sku, p.title FROM order_items oi
           JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`
        )
        .all(order.id) as Array<{
        id: string;
        supplier_vid: string;
        supplier_sku: string;
        title: string;
        quantity: number;
      }>;

      if (isCjConfigured()) {
        const missingVid = items.filter((i) => !i.supplier_vid);
        if (missingVid.length > 0) {
          throw new Error(`Missing CJ variant ID for: ${missingVid.map((i) => i.title).join(", ")}`);
        }

        const shipping = buildShippingAddress(order);
        const { cjOrderId, orderNum } = await createCjOrder({
          orderNumber: order.id.replace(/-/g, "").slice(0, 20),
          shipping,
          items: items.map((i) => ({
            vid: i.supplier_vid,
            quantity: i.quantity,
            storeLineItemId: i.id,
          })),
        });

        db.prepare(`
          UPDATE orders SET
            status = 'fulfilled',
            supplier_order_id = ?,
            updated_at = ?
          WHERE id = ?
        `).run(cjOrderId, new Date().toISOString(), order.id);

        await logAutomation(
          "order_fulfillment",
          "success",
          `CJ order ${orderNum} created for ${order.customer_email}`,
          { cjOrderId, orderId: order.id }
        );
      } else {
        throw new Error("CJ_API_KEY not configured — cannot fulfill orders");
      }

      fulfilled++;
    } catch (err) {
      await logAutomation(
        "order_fulfillment",
        "error",
        `Failed to fulfill order ${order.id}: ${String(err)}`
      );
    }
  }

  return fulfilled;
}

function buildShippingAddress(order: {
  customer_name: string;
  customer_email: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_county: string;
  shipping_postcode: string;
  shipping_phone: string;
  shipping_address: string;
}): UkShippingAddress {
  if (order.shipping_line1 && order.shipping_postcode) {
    return {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.shipping_phone || "07000000000",
      line1: order.shipping_line1,
      line2: order.shipping_line2 || undefined,
      city: order.shipping_city || "London",
      county: order.shipping_county || undefined,
      postcode: order.shipping_postcode,
    };
  }

  const parsed = parseUkAddress(order.shipping_address);
  return {
    name: order.customer_name,
    email: order.customer_email,
    phone: order.shipping_phone || "07000000000",
    line1: parsed.line1,
    city: parsed.city,
    postcode: parsed.postcode,
  };
}

export async function markShippedOrders(): Promise<number> {
  if (!isCjConfigured()) return 0;

  const orders = db
    .prepare(
      "SELECT id, supplier_order_id FROM orders WHERE status = 'fulfilled' AND supplier_order_id IS NOT NULL"
    )
    .all() as { id: string; supplier_order_id: string }[];

  const update = db.prepare(
    "UPDATE orders SET status = 'shipped', tracking_number = ?, updated_at = ? WHERE id = ?"
  );
  const now = new Date().toISOString();
  let shipped = 0;

  for (const order of orders) {
    const tracking = await getCjOrderTracking(order.supplier_order_id);
    if (tracking) {
      update.run(tracking, now, order.id);
      shipped++;
    }
  }

  if (shipped > 0) {
    await logAutomation("shipping_update", "success", `${shipped} order(s) now shipped with tracking`);
  }

  return shipped;
}

export type UkCheckoutDetails = {
  email: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
};

export function createDemoOrder(
  details: UkCheckoutDetails,
  items: Array<{ productId: string; quantity: number }>
): string {
  const orderId = uuidv4();
  const now = new Date().toISOString();

  const shippingAddress = [
    details.line1,
    details.city,
    details.county,
    details.postcode,
    "GB",
  ]
    .filter(Boolean)
    .join(", ");

  let total = 0;

  const getProduct = db.prepare("SELECT * FROM products WHERE id = ? AND is_active = 1");
  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, supplier_cost)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  type LineItem = {
    product: { id: string; retail_price: number; supplier_cost: number; stock: number };
    quantity: number;
  };

  const lineItems: LineItem[] = [];

  for (const item of items) {
    const product = getProduct.get(item.productId) as
      | { id: string; retail_price: number; supplier_cost: number; stock: number }
      | undefined;
    if (!product || product.stock < item.quantity) {
      throw new Error("Product unavailable — remove it from your cart and add it again");
    }
    lineItems.push({ product, quantity: item.quantity });
    total += product.retail_price * item.quantity;
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO orders (
        id, stripe_session_id, customer_email, customer_name, shipping_address,
        shipping_line1, shipping_line2, shipping_city, shipping_county, shipping_postcode, shipping_phone,
        status, total, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?)
    `).run(
      orderId,
      details.email,
      details.name,
      shippingAddress,
      details.line1,
      details.line2 ?? "",
      details.city,
      details.county ?? "",
      details.postcode,
      details.phone,
      total,
      now,
      now
    );

    for (const { product, quantity } of lineItems) {
      insertItem.run(
        uuidv4(),
        orderId,
        product.id,
        quantity,
        product.retail_price,
        product.supplier_cost
      );

      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(quantity, product.id);
    }
  });

  transaction();
  return orderId;
}
