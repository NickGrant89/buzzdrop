"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreLayout } from "@/components/StoreLayout";
import { OrderStatusCard } from "@/components/OrderStatusCard";
import { CheckCircle, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { PublicOrder, PublicOrderItem } from "@/lib/order-display";
import { trackPurchase } from "@/lib/meta-pixel";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const orderId = searchParams.get("order_id");
  const sessionId = searchParams.get("session_id");
  const paymentIntentId = searchParams.get("payment_intent");
  const isDemo = searchParams.get("demo") === "true";

  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [items, setItems] = useState<PublicOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      if ((sessionId || paymentIntentId) && !isDemo) {
        await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId ?? undefined,
            payment_intent_id: paymentIntentId ?? undefined,
          }),
        });
      }

      if (orderId) {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
          setItems(data.items);
          clearCart();
          sessionStorage.removeItem("stripe_checkout");

          const productIds = (data.items as Array<{ product_id: string }>).map(
            (i) => i.product_id
          );
          const numItems = (data.items as PublicOrderItem[]).reduce(
            (n, i) => n + i.quantity,
            0
          );

          if (!isDemo && (paymentIntentId || data.order.status !== "pending")) {
            trackPurchase({
              orderId: data.order.id,
              total: data.order.total,
              productIds,
              numItems,
            });
          }
        }
      }
      setLoading(false);
    }
    loadOrder();
  }, [orderId, sessionId, paymentIntentId, isDemo, clearCart]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        {loading ? (
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-violet-400" />
        ) : (
          <>
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-400" />
            <h1 className="mb-2 text-3xl font-bold text-white">Order confirmed!</h1>
            <p className="mb-8 text-zinc-400">
              {isDemo
                ? "Demo order placed — fulfillment automation will process it within 5 minutes."
                : "Thank you for your purchase. Your payment was successful and your order is being fulfilled."}
            </p>

            {order && (
              <div className="mb-8 text-left">
                <OrderStatusCard order={order} items={items} />
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="rounded-xl bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
              >
                Continue shopping
              </Link>
              {order && (
                <Link
                  href={`/track-order?order_id=${encodeURIComponent(order.id)}&email=${encodeURIComponent(order.customer_email)}`}
                  className="rounded-xl border border-zinc-700 px-6 py-3 font-medium text-zinc-300 hover:border-zinc-500"
                >
                  Track this order
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
