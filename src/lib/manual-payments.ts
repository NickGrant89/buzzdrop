import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { getProductById } from "./products";
import { getSiteUrl } from "./seo";

export type ManualPaymentInput = {
  customerName: string;
  customerEmail: string;
  description: string;
  amountGbp: number;
  notes?: string;
  productId?: string;
  quantity?: number;
  destCountryCode?: string;
  destPostcode?: string;
};

export type ManualPaymentItem = {
  title: string;
  quantity: number;
  slug: string;
  imageUrl: string;
};

export type ManualPaymentPublic = {
  orderId: string;
  customerName: string;
  description: string;
  amountGbp: number;
  status: string;
  paid: boolean;
  item: ManualPaymentItem | null;
};

export type PendingManualPayment = {
  id: string;
  customer_email: string;
  customer_name: string;
  total: number;
  manual_description: string;
  manual_notes: string;
  status: string;
  created_at: string;
  productTitle: string | null;
  productSlug: string | null;
  supplierSku: string | null;
  supplierVid: string | null;
  quantity: number | null;
};

export function isManualOrder(order: { order_kind?: string | null }): boolean {
  return order.order_kind === "manual";
}

function getManualOrderItem(orderId: string): ManualPaymentItem | null {
  const row = db
    .prepare(
      `SELECT oi.quantity, p.title, p.slug, p.image_url
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?
       LIMIT 1`
    )
    .get(orderId) as
    | { quantity: number; title: string; slug: string; image_url: string }
    | undefined;

  if (!row) return null;

  return {
    title: row.title,
    quantity: row.quantity,
    slug: row.slug,
    imageUrl: row.image_url,
  };
}

export function createManualPayment(input: ManualPaymentInput): {
  orderId: string;
  payUrl: string;
} {
  const productId = input.productId?.trim();
  const quantity = Math.min(10, Math.max(1, Math.floor(input.quantity ?? 1)));
  let description = input.description.trim();

  if (productId) {
    const product = getProductById(productId);
    if (!product || !product.is_active) {
      throw new Error("Product not found or inactive");
    }
    if (!description) {
      description = product.title;
    }
  }

  if (!description) {
    throw new Error("Description is required");
  }

  const orderId = uuidv4();
  const now = new Date().toISOString();
  const notes = input.notes?.trim() ?? "";
  const destCountryCode = input.destCountryCode?.trim().toUpperCase() ?? "";
  const destPostcode = input.destPostcode?.trim() ?? "";
  const shippingAddress = notes || "Manual order — fulfil from admin notes";
  const total = Math.round(input.amountGbp * 100) / 100;

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO orders (
        id, stripe_session_id, customer_email, customer_name, shipping_address,
        shipping_line1, shipping_line2, shipping_city, shipping_county, shipping_postcode, shipping_phone,
        status, total, order_kind, manual_description, manual_notes,
        created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, '', '', '', ?, ?, '', 'pending', ?, 'manual', ?, ?, ?, ?)
    `).run(
      orderId,
      input.customerEmail.trim().toLowerCase(),
      input.customerName.trim(),
      shippingAddress,
      destCountryCode,
      destPostcode,
      total,
      description,
      notes,
      now,
      now
    );

    if (productId) {
      const product = getProductById(productId)!;
      const unitPrice = Math.round((total / quantity) * 100) / 100;
      db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, supplier_cost)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        orderId,
        product.id,
        quantity,
        unitPrice,
        product.supplier_cost
      );
    }
  });

  transaction();

  return {
    orderId,
    payUrl: `${getSiteUrl()}/pay/${orderId}`,
  };
}

export function getManualPaymentPublic(orderId: string): ManualPaymentPublic | null {
  const order = db
    .prepare(
      `SELECT id, customer_name, manual_description, total, status
       FROM orders WHERE id = ? AND order_kind = 'manual'`
    )
    .get(orderId) as
    | {
        id: string;
        customer_name: string;
        manual_description: string;
        total: number;
        status: string;
      }
    | undefined;

  if (!order) return null;

  return {
    orderId: order.id,
    customerName: order.customer_name,
    description: order.manual_description,
    amountGbp: order.total,
    status: order.status,
    paid: order.status !== "pending",
    item: getManualOrderItem(order.id),
  };
}

export function listPendingManualPayments(limit = 10): PendingManualPayment[] {
  return db
    .prepare(
      `SELECT
         o.id,
         o.customer_email,
         o.customer_name,
         o.total,
         o.manual_description,
         o.manual_notes,
         o.status,
         o.created_at,
         p.title AS productTitle,
         p.slug AS productSlug,
         p.supplier_sku AS supplierSku,
         p.supplier_vid AS supplierVid,
         oi.quantity AS quantity
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.order_kind = 'manual' AND o.status = 'pending'
       ORDER BY o.created_at DESC
       LIMIT ?`
    )
    .all(limit) as PendingManualPayment[];
}
