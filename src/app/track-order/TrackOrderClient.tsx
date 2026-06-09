"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, PackageSearch } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { OrderStatusCard } from "@/components/OrderStatusCard";
import type { PublicOrder, PublicOrderItem } from "@/lib/order-display";

export default function TrackOrderClient() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    order: PublicOrder;
    items: PublicOrderItem[];
  } | null>(null);

  useEffect(() => {
    const id = searchParams.get("order_id");
    const prefillEmail = searchParams.get("email");
    if (id) setOrderId(id);
    if (prefillEmail) setEmail(prefillEmail);
  }, [searchParams]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Order not found");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <PackageSearch className="mx-auto mb-4 h-12 w-12 text-violet-400" />
          <h1 className="text-3xl font-bold text-white">Track your order</h1>
          <p className="mt-2 text-zinc-400">
            Enter the email and order number from your confirmation page or receipt.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-8 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-violet-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="order_id" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Order number
            </label>
            <input
              id="order_id"
              type="text"
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-sm text-white outline-none focus:border-violet-500"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Looking up order…
              </>
            ) : (
              "Track order"
            )}
          </button>
        </form>

        {result && (
          <div className="mb-8">
            <OrderStatusCard order={result.order} items={result.items} />
          </div>
        )}

        <p className="text-center text-sm text-zinc-500">
          Need help?{" "}
          <a href="mailto:support@buzzdrop.co.uk" className="text-zinc-300 hover:text-white">
            support@buzzdrop.co.uk
          </a>
          {" · "}
          <Link href="/returns" className="text-zinc-300 hover:text-white">
            Returns policy
          </Link>
        </p>
      </div>
    </StoreLayout>
  );
}
