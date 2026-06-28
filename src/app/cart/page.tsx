"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { CheckoutButton } from "@/components/AddToCartButton";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { SHIP_COUNTRIES, countryConfig } from "@/lib/ship-countries";
import { DELIVERY_ESTIMATE, SHIPPING_BADGE, SUPPORT_EMAIL, UK_FREE_SHIPPING } from "@/lib/store-copy";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("GB");
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingNote, setShippingNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const capturedEmailRef = useRef("");
  const shipConfig = countryConfig(country);
  const orderTotal = total + shippingCost;

  const refreshShipping = useCallback(async () => {
    if (items.length === 0) {
      setShippingCost(0);
      setShippingNote("");
      return;
    }
    if (postcode.trim().length < 2) {
      setShippingCost(country === "GB" ? 0 : shippingCost);
      setShippingNote(country === "GB" ? UK_FREE_SHIPPING : "Enter postcode to calculate shipping");
      return;
    }

    setShippingLoading(true);
    try {
      const res = await fetch("/api/checkout/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          country,
          postcode: postcode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Shipping quote failed");
      setShippingCost(data.shippingCostGbp);
      setShippingNote(
        data.shippingCostGbp === 0
          ? UK_FREE_SHIPPING
          : `${data.logisticName} · ${data.deliveryEstimate}`
      );
    } catch (err) {
      setShippingNote(err instanceof Error ? err.message : "Could not quote shipping");
      if (country === "GB") {
        setShippingCost(0);
      }
    } finally {
      setShippingLoading(false);
    }
  }, [items, country, postcode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshShipping();
    }, 400);
    return () => clearTimeout(timer);
  }, [refreshShipping]);

  useEffect(() => {
    fetch("/api/checkout/status")
      .then((res) => res.json())
      .then((data) => setStripeEnabled(data.configured === true))
      .catch(() => setStripeEnabled(false));
  }, []);

  async function captureCartEmail(rawEmail: string) {
    const normalized = rawEmail.trim().toLowerCase();
    if (!normalized.includes("@") || items.length === 0) return;
    if (capturedEmailRef.current === normalized) return;

    capturedEmailRef.current = normalized;
    try {
      await fetch("/api/cart/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
    } catch {
      capturedEmailRef.current = "";
    }
  }

  async function handleCheckout() {
    if (!email || !name || !phone || !line1 || !city || !postcode) {
      setError("Please fill in all required fields");
      return;
    }
    if (country !== "GB" && shippingCost <= 0 && shippingLoading) {
      setError("Calculating shipping — try again in a moment");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          email,
          name,
          phone,
          line1,
          line2: line2 || undefined,
          city,
          county: county || undefined,
          postcode,
          country,
          shippingCostGbp: shippingCost,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");

      if (data.demo) {
        clearCart();
        window.location.href = data.url;
        return;
      }

      if (data.clientSecret) {
        sessionStorage.setItem(
          "stripe_checkout",
          JSON.stringify({
            clientSecret: data.clientSecret,
            orderId: data.orderId,
            email: data.email,
            name: data.name,
            phone: data.phone,
            line1: data.line1,
            line2: data.line2,
            city: data.city,
            county: data.county,
            postcode: data.postcode,
            country: data.country,
            total: data.total,
            productIds: items.map((i) => i.productId),
            numItems: items.reduce((n, i) => n + i.quantity, 0),
          })
        );
        router.push("/checkout");
        return;
      }

      throw new Error("Invalid checkout response");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-3xl font-bold text-white">Your Cart</h1>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
            <p className="text-zinc-400">Your cart is empty</p>
            <Link
              href="/"
              className="mt-4 inline-block text-violet-400 hover:text-violet-300"
            >
              Browse trending products
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <Link
                      href={`/product/${item.slug}`}
                      className="font-medium text-white hover:text-violet-300"
                    >
                      {item.title}
                    </Link>
                    <p className="text-violet-400">{formatPrice(item.price)}</p>
                    <div className="mt-auto flex items-center gap-3">
                      <div className="flex items-center rounded-lg border border-zinc-700">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1.5 text-zinc-400 hover:text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1.5 text-zinc-400 hover:text-white"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="font-semibold text-white">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2">
              <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">Delivery</h2>

                <div className="space-y-3">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                  >
                    {SHIP_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="email"
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => void captureCartEmail(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Full name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder="Phone *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Address line 1 *"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Address line 2"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City *"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder={`${shipConfig.postcodeLabel} *`}
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={country === "GB" ? "County (optional)" : "State / province (optional)"}
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="my-4 border-t border-zinc-800 pt-4">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-zinc-400">
                    <span>Shipping</span>
                    <span className={shippingCost === 0 ? "text-emerald-400" : "text-white"}>
                      {shippingLoading
                        ? "Calculating…"
                        : shippingCost === 0
                          ? "Free"
                          : formatPrice(shippingCost)}
                    </span>
                  </div>
                  {shippingNote && (
                    <p className="mt-1 text-xs text-zinc-500">{shippingNote}</p>
                  )}
                  <div className="mt-3 flex justify-between text-lg font-bold text-white">
                    <span>Total</span>
                    <span>{formatPrice(orderTotal)}</span>
                  </div>
                </div>

                {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

                <CheckoutButton
                  onCheckout={handleCheckout}
                  loading={loading}
                  total={formatPrice(orderTotal)}
                  label={
                    stripeEnabled
                      ? `Pay securely — ${formatPrice(orderTotal)}`
                      : `Checkout (demo) — ${formatPrice(orderTotal)}`
                  }
                />

                <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
                  {stripeEnabled
                    ? `Secure Stripe checkout · Card & Apple Pay · ${SHIPPING_BADGE} · 14-day returns`
                    : "Demo checkout — add Stripe keys to .env.local for real payments"}
                </p>
                <p className="mt-2 text-center text-xs text-zinc-500">
                  {DELIVERY_ESTIMATE} ·{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-zinc-400 hover:text-zinc-300">
                    {SUPPORT_EMAIL}
                  </a>
                </p>
                <p className="mt-2 text-center text-xs text-zinc-500">
                  By checking out you agree to our{" "}
                  <Link href="/privacy" className="text-zinc-400 hover:text-zinc-300">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/returns" className="text-zinc-400 hover:text-zinc-300">
                    Returns Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
