"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { StoreLayout } from "@/components/StoreLayout";
import { formatPrice } from "@/lib/utils";
import { CheckCircle, CreditCard, Loader2 } from "lucide-react";

type PaymentDetails = {
  orderId: string;
  customerName: string;
  description: string;
  amountGbp: number;
  status: string;
  paid: boolean;
  stripeEnabled: boolean;
  item: {
    title: string;
    quantity: number;
    slug: string;
    imageUrl: string;
  } | null;
};

export default function ManualPayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const cancelled = searchParams.get("cancelled") === "1";

  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/pay/${orderId}`);
      if (res.ok) {
        setPayment(await res.json());
      }
      setLoading(false);
    }
    load();
  }, [orderId]);

  async function handlePay() {
    setPaying(true);
    setError("");

    try {
      const res = await fetch(`/api/pay/${orderId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed");

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("No checkout URL returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setPaying(false);
    }
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
          </div>
        ) : !payment ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Payment not found</h1>
            <p className="mt-2 text-zinc-400">This link may be invalid or expired.</p>
            <Link href="/" className="mt-6 inline-block text-violet-400 hover:text-violet-300">
              Back to BuzzDrop
            </Link>
          </div>
        ) : payment.paid ? (
          <div className="text-center">
            <CheckCircle className="mx-auto mb-4 h-14 w-14 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white">Already paid</h1>
            <p className="mt-2 text-zinc-400">
              Thanks {payment.customerName.split(" ")[0]} — this order has been paid.
            </p>
            <Link
              href={`/order/success?order_id=${payment.orderId}`}
              className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
            >
              View order
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="text-sm font-medium uppercase tracking-wide text-violet-400">
              Secure payment
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">BuzzDrop order</h1>
            <p className="mt-1 text-zinc-400">Hi {payment.customerName.split(" ")[0]},</p>

            <div className="mt-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              {payment.item && (
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={payment.item.imageUrl}
                    alt={payment.item.title}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Item</p>
                    <p className="mt-1 font-medium text-white">
                      {payment.item.quantity}x {payment.item.title}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Order</p>
                <p className="mt-1 text-white">{payment.description}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Total</p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {formatPrice(payment.amountGbp)}
                </p>
              </div>
            </div>

            {cancelled && (
              <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                Payment cancelled — you can try again when ready.
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}

            {!payment.stripeEnabled ? (
              <p className="mt-6 text-sm text-amber-300">
                Card payments are not configured on this store yet.
              </p>
            ) : (
              <button
                type="button"
                onClick={handlePay}
                disabled={paying}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {paying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                {paying ? "Redirecting to Stripe…" : `Pay ${formatPrice(payment.amountGbp)}`}
              </button>
            )}

            <p className="mt-4 text-center text-xs text-zinc-500">
              Secure checkout powered by Stripe. Questions? Reply to your BuzzDrop message.
            </p>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
