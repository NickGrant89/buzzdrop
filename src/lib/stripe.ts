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

  if (items.length === 0) {
    return orderId;
  }

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
    automatic_payment_methods: { enabled: true },
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

export async function createManualPaymentCheckout(
  orderId: string,
  appUrl: string
): Promise<{ demo: true; orderId: string } | { demo: false; url: string; orderId: string }> {
  const order = db
    .prepare(
      `SELECT id, customer_email, customer_name, total, status, manual_description, order_kind
       FROM orders WHERE id = ?`
    )
    .get(orderId) as
    | {
        id: string;
        customer_email: string;
        customer_name: string;
        total: number;
        status: string;
        manual_description: string;
        order_kind: string;
      }
    | undefined;

  if (!order || order.order_kind !== "manual") {
    throw new Error("Manual payment not found");
  }
  if (order.status !== "pending") {
    throw new Error("This payment link has already been used");
  }

  const amount = Math.round(order.total * 100);
  if (amount < 30) {
    throw new Error("Amount is below Stripe minimum (£0.30)");
  }

  const stripe = getStripe();
  if (!stripe) {
    return { demo: true, orderId };
  }

  const description = order.manual_description || "BuzzDrop order";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.customer_email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: storeConfig.currency.toLowerCase(),
          unit_amount: amount,
          product_data: {
            name: description.slice(0, 120),
            description: "BuzzDrop manual order",
          },
        },
      },
    ],
    metadata: {
      order_id: orderId,
      order_kind: "manual",
      customer_name: order.customer_name,
    },
    success_url: `${appUrl}/order/success?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pay/${orderId}?cancelled=1`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  db.prepare("UPDATE orders SET stripe_session_id = ?, updated_at = ? WHERE id = ?").run(
    session.id,
    new Date().toISOString(),
    orderId
  );

  return { demo: false, url: session.url, orderId };
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
