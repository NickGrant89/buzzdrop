"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreLayout } from "@/components/StoreLayout";
import { CheckCircle, Truck, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

type OrderData = {
  order: {
    id: string;
    status: string;
    total: number;
    tracking_number: string | null;
    supplier_order_id: string | null;
    customer_email: string;
  };
  items: Array<{ title: string; quantity: number; unit_price: number }>;
};

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const orderId = searchParams.get("order_id");
  const sessionId = searchParams.get("session_id");
  const paymentIntentId = searchParams.get("payment_intent");
  const isDemo = searchParams.get("demo") === "true";

  const [order, setOrder] = useState<OrderData | null>(null);
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
          setOrder(await res.json());
          clearCart();
          sessionStorage.removeItem("stripe_checkout");
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
              <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-left">
                <p className="text-sm text-zinc-500">Order ID</p>
                <p className="mb-4 font-mono text-sm text-white">{order.order.id}</p>

                <p className="text-sm text-zinc-500">Status</p>
                <p className="mb-4 capitalize text-violet-400">{order.order.status}</p>

                <p className="text-sm text-zinc-500">Total</p>
                <p className="mb-4 text-lg font-bold text-white">
                  {formatPrice(order.order.total)}
                </p>

                {order.items.map((item, i) => (
                  <p key={i} className="text-sm text-zinc-400">
                    {item.quantity}x {item.title}
                  </p>
                ))}

                {order.order.tracking_number && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3">
                    <Truck className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">
                      Tracking: {order.order.tracking_number}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="rounded-xl bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
              >
                Continue shopping
              </Link>
              <Link
                href="/admin"
                className="rounded-xl border border-zinc-700 px-6 py-3 font-medium text-zinc-300 hover:border-zinc-500"
              >
                View automation dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
