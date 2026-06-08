import Stripe from "stripe";
import { db } from "./db";
import { getProductById } from "./products";
import { storeConfig } from "./config";
import { v4 as uuidv4 } from "uuid";
import type { UkCheckoutDetails } from "./automation/fulfillment";

export function isStripeConfigured(): boolean {
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return secret.startsWith("sk_") && publishable.startsWith("pk_");
}

export function getStripe() {
  if (!isStripeConfigured()) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export type CheckoutItem = { productId: string; quantity: number };

function toUkPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return phone;
  if (digits.startsWith("44")) return `+${digits}`;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  return `+44${digits}`;
}

function insertPendingOrder(
  orderId: string,
  details: UkCheckoutDetails,
  items: CheckoutItem[],
  total: number,
  stripeRef: string | null
) {
  const now = new Date().toISOString();
  const shippingAddress = [
    details.line1,
    details.city,
    details.county,
    details.postcode,
    "United Kingdom",
  ]
    .filter(Boolean)
    .join(", ");

  db.prepare(`
    INSERT INTO orders (
      id, stripe_session_id, customer_email, customer_name, shipping_address,
      shipping_line1, shipping_line2, shipping_city, shipping_county, shipping_postcode, shipping_phone,
      status, total, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(
    orderId,
    stripeRef,
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

  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, supplier_cost)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    const product = getProductById(item.productId)!;
    insertItem.run(
      uuidv4(),
      orderId,
      product.id,
      item.quantity,
      product.retail_price,
      product.supplier_cost
    );
  }
}

function finalizePaidOrder(orderId: string): string | null {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as
    | { status: string }
    | undefined;

  if (!order) return null;
  if (order.status === "paid") return orderId;

  db.prepare(`
    UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ?
  `).run(new Date().toISOString(), orderId);

  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(orderId) as Array<{ product_id: string; quantity: number }>;

  const transaction = db.transaction(() => {
    for (const item of items) {
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(
        item.quantity,
        item.product_id
      );
    }
  });
  transaction();

  return orderId;
}

export async function createOrderPayment(items: CheckoutItem[], details: UkCheckoutDetails) {
  const stripe = getStripe();
  const orderId = uuidv4();
  let total = 0;

  for (const item of items) {
    const product = getProductById(item.productId);
    if (!product || product.stock < item.quantity) {
      throw new Error(`Product unavailable: ${item.productId}`);
    }
    total += product.retail_price * item.quantity;
  }

  const amount = Math.round(total * 100);
  if (amount < 30) {
    throw new Error("Order total is below Stripe minimum (£0.30)");
  }

  if (!stripe) {
    return { demo: true as const, orderId, total };
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: storeConfig.currency.toLowerCase(),
    payment_method_types: ["card"],
    receipt_email: details.email,
    metadata: {
      order_id: orderId,
      customer_phone: toUkPhoneE164(details.phone),
      customer_name: details.name,
      shipping_line1: details.line1,
      shipping_line2: details.line2 ?? "",
      shipping_city: details.city,
      shipping_county: details.county ?? "",
      shipping_postcode: details.postcode.toUpperCase(),
    },
    shipping: {
      name: details.name,
      phone: toUkPhoneE164(details.phone),
      address: {
        line1: details.line1,
        line2: details.line2 || undefined,
        city: details.city,
        state: details.county || undefined,
        postal_code: details.postcode.toUpperCase(),
        country: "GB",
      },
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error("Stripe did not return a payment client secret");
  }

  insertPendingOrder(orderId, details, items, total, paymentIntent.id);

  return {
    demo: false as const,
    clientSecret: paymentIntent.client_secret,
    orderId,
    total,
  };
}

export async function handlePaymentIntentComplete(
  paymentIntentId: string
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== "succeeded") return null;

  const orderId = paymentIntent.metadata?.order_id;
  if (!orderId) return null;

  return finalizePaidOrder(orderId);
}

export async function handleCheckoutComplete(sessionId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return null;

  const orderId = session.metadata?.order_id;
  if (!orderId) return null;

  return finalizePaidOrder(orderId);
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.id) {
      await handleCheckoutComplete(session.id);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    if (paymentIntent.id) {
      await handlePaymentIntentComplete(paymentIntent.id);
    }
  }
}
