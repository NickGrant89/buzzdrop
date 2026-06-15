import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { getSiteUrl } from "./seo";

export type ManualPaymentInput = {
  customerName: string;
  customerEmail: string;
  description: string;
  amountGbp: number;
  notes?: string;
};

export type ManualPaymentPublic = {
  orderId: string;
  customerName: string;
  description: string;
  amountGbp: number;
  status: string;
  paid: boolean;
};

export function isManualOrder(order: { order_kind?: string | null }): boolean {
  return order.order_kind === "manual";
}

export function createManualPayment(input: ManualPaymentInput): {
  orderId: string;
  payUrl: string;
} {
  const orderId = uuidv4();
  const now = new Date().toISOString();
  const notes = input.notes?.trim() ?? "";
  const shippingAddress = notes || "Manual order — fulfil from admin notes";

  db.prepare(`
    INSERT INTO orders (
      id, stripe_session_id, customer_email, customer_name, shipping_address,
      shipping_line1, shipping_line2, shipping_city, shipping_county, shipping_postcode, shipping_phone,
      status, total, order_kind, manual_description, manual_notes,
      created_at, updated_at
    ) VALUES (?, NULL, ?, ?, ?, '', '', '', '', '', '', 'pending', ?, 'manual', ?, ?, ?, ?)
  `).run(
    orderId,
    input.customerEmail.trim().toLowerCase(),
    input.customerName.trim(),
    shippingAddress,
    Math.round(input.amountGbp * 100) / 100,
    input.description.trim(),
    notes,
    now,
    now
  );

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
  };
}

export function listPendingManualPayments(limit = 10) {
  return db
    .prepare(
      `SELECT id, customer_email, customer_name, total, manual_description, manual_notes, status, created_at
       FROM orders
       WHERE order_kind = 'manual' AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    id: string;
    customer_email: string;
    customer_name: string;
    total: number;
    manual_description: string;
    manual_notes: string;
    status: string;
    created_at: string;
  }>;
}
