"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/db";
import { useCart } from "@/context/CartContext";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  trackViewContent,
  trackAddToCart,
  createMetaEventId,
  getFbclidFromLocation,
} from "@/lib/meta-pixel";

export function ProductDetailClient({
  product,
  displayPrice,
  stickyCheckout = false,
}: {
  product: Product;
  displayPrice: number;
  stickyCheckout?: boolean;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const eventId = createMetaEventId("vc");
    const eventSourceUrl = window.location.href;
    const fbclid = getFbclidFromLocation();
    const tracked = { ...product, retail_price: displayPrice };

    trackViewContent(tracked, eventId);

    fetch("/api/products/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        eventId,
        eventSourceUrl,
        fbclid,
      }),
    }).catch(() => {});
  }, [product, displayPrice]);

  function trackedProduct() {
    return { ...product, retail_price: displayPrice };
  }

  function cartItem() {
    return {
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: product.image_url,
      price: displayPrice,
    };
  }

  function handleAddToCart() {
    if (product.stock <= 0) return;
    addItem(cartItem(), quantity);
    trackAddToCart(trackedProduct(), quantity, createMetaEventId("atc"));
  }

  function handleBuyNow() {
    if (product.stock <= 0) return;
    addItem(cartItem(), quantity);
    trackAddToCart(trackedProduct(), quantity, createMetaEventId("atc"));
    router.push("/cart");
  }

  const outOfStock = product.stock <= 0;
  const priceLabel = formatPrice(displayPrice * quantity);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">Quantity</span>
          <div className="flex items-center rounded-lg border border-zinc-700">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-2 text-zinc-400 hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-medium">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              className="p-2 text-zinc-400 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AddToCartButton
            label={outOfStock ? "Out of Stock" : "Add to Cart"}
            onAdd={handleAddToCart}
          />
          {!outOfStock ? (
            <button
              type="button"
              onClick={handleBuyNow}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-3.5 text-base font-semibold text-amber-300 transition hover:bg-amber-500/20 active:scale-[0.98]"
            >
              <ShoppingBag className="h-5 w-5" />
              Buy now — {priceLabel}
            </button>
          ) : null}
        </div>
      </div>

      {stickyCheckout && !outOfStock ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{priceLabel}</p>
              <p className="text-xs text-emerald-400">Free UK delivery</p>
            </div>
            <button
              type="button"
              onClick={handleBuyNow}
              className="shrink-0 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Buy now
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
