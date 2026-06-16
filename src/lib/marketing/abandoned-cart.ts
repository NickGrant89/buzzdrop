import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { emailLayout, sendEmail } from "../email";
import { getSiteUrl } from "../seo";
import { formatPrice } from "../utils";
import { logAutomation } from "../automation/logger";

type PendingOrder = {
  id: string;
  customer_email: string;
  customer_name: string;
  total: number;
  created_at: string;
  abandoned_reminder_1_at: string | null;
  abandoned_reminder_2_at: string | null;
};

function orderItemsSummary(orderId: string): string {
  const items = db
    .prepare(
      `SELECT oi.quantity, p.title FROM order_items oi
       JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`
    )
    .all(orderId) as Array<{ quantity: number; title: string }>;

  if (items.length === 0) return "Your BuzzDrop order";
  return items.map((item) => `${item.quantity}x ${item.title}`).join(", ");
}

function buildRecoveryEmail(order: PendingOrder, stage: 1 | 2) {
  const firstName = order.customer_name.split(" ")[0] || "there";
  const items = orderItemsSummary(order.id);
  const cartUrl = `${getSiteUrl()}/cart`;

  const headline =
    stage === 1
      ? "You left something in your cart"
      : "Still thinking it over?";

  const bodyCopy =
    stage === 1
      ? `You started checkout but didn't finish. Your items are still waiting — free UK delivery on every order.`
      : `Your order is still open. Complete checkout today before stock runs low.`;

  const html = emailLayout(`
    <h1 style="margin:0 0 12px;font-size:22px;color:#fff;">${headline}</h1>
    <p style="margin:0 0 16px;color:#d4d4d8;line-height:1.6;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;color:#d4d4d8;line-height:1.6;">${bodyCopy}</p>
    <p style="margin:0 0 8px;color:#a1a1aa;font-size:14px;">${items}</p>
    <p style="margin:0 0 24px;font-size:24px;font-weight:700;color:#fff;">${formatPrice(order.total)}</p>
    <a href="${cartUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600;">
      Complete your order
    </a>
  `);

  const subject =
    stage === 1
      ? `Complete your BuzzDrop order — ${formatPrice(order.total)}`
      : `Your BuzzDrop cart is waiting (${formatPrice(order.total)})`;

  return { html, subject };
}

async function sendReminder(order: PendingOrder, stage: 1 | 2): Promise<boolean> {
  const { html, subject } = buildRecoveryEmail(order, stage);
  const result = await sendEmail({
    to: order.customer_email,
    subject,
    html,
    text: `${subject}\n\nComplete your order: ${getSiteUrl()}/cart`,
  });

  if (!result.ok) {
    await logAutomation(
      "abandoned_cart_email",
      "error",
      `Failed ${stage === 1 ? "1h" : "24h"} reminder for ${order.id}: ${result.error ?? "unknown"}`
    );
    return false;
  }

  const column = stage === 1 ? "abandoned_reminder_1_at" : "abandoned_reminder_2_at";
  db.prepare(`UPDATE orders SET ${column} = ?, updated_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    new Date().toISOString(),
    order.id
  );

  await logAutomation(
    "abandoned_cart_email",
    "success",
    `Sent ${stage === 1 ? "1h" : "24h"} reminder to ${order.customer_email}`,
    { orderId: order.id }
  );

  return true;
}

export async function sendAbandonedCheckoutEmails(): Promise<{ sent: number; errors: number }> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { sent: 0, errors: 0 };
  }

  let sent = 0;
  let errors = 0;

  const reminder1Candidates = db
    .prepare(
      `SELECT id, customer_email, customer_name, total, created_at, abandoned_reminder_1_at, abandoned_reminder_2_at
       FROM orders
       WHERE status = 'pending'
         AND COALESCE(order_kind, 'standard') = 'standard'
         AND abandoned_reminder_1_at IS NULL
         AND datetime(created_at) <= datetime('now', '-1 hour')
       ORDER BY created_at ASC
       LIMIT 20`
    )
    .all() as PendingOrder[];

  for (const order of reminder1Candidates) {
    if (await sendReminder(order, 1)) sent++;
    else errors++;
  }

  const reminder2Candidates = db
    .prepare(
      `SELECT id, customer_email, customer_name, total, created_at, abandoned_reminder_1_at, abandoned_reminder_2_at
       FROM orders
       WHERE status = 'pending'
         AND COALESCE(order_kind, 'standard') = 'standard'
         AND abandoned_reminder_1_at IS NOT NULL
         AND abandoned_reminder_2_at IS NULL
         AND datetime(created_at) <= datetime('now', '-24 hours')
       ORDER BY created_at ASC
       LIMIT 20`
    )
    .all() as PendingOrder[];

  for (const order of reminder2Candidates) {
    if (await sendReminder(order, 2)) sent++;
    else errors++;
  }

  return { sent, errors };
}

export function captureCartLead(email: string, items: Array<{ productId: string; quantity: number }>) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return;

  const now = new Date().toISOString();
  const cartJson = JSON.stringify(items);

  const existing = db
    .prepare(
      `SELECT id FROM cart_leads WHERE email = ? AND converted_at IS NULL ORDER BY created_at DESC LIMIT 1`
    )
    .get(normalized) as { id: string } | undefined;

  if (existing) {
    db.prepare(`UPDATE cart_leads SET cart_json = ?, updated_at = ? WHERE id = ?`).run(
      cartJson,
      now,
      existing.id
    );
    return;
  }

  db.prepare(
    `INSERT INTO cart_leads (id, email, cart_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(uuidv4(), normalized, cartJson, now, now);
}

export function markCartLeadConverted(email: string) {
  const normalized = email.trim().toLowerCase();
  db.prepare(
    `UPDATE cart_leads SET converted_at = ?, updated_at = ? WHERE email = ? AND converted_at IS NULL`
  ).run(new Date().toISOString(), new Date().toISOString(), normalized);
}
