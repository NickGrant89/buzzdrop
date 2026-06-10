"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/db";
import { useCart } from "@/context/CartContext";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Minus, Plus } from "lucide-react";

export function ProductDetailClient({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetch("/api/products/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    }).catch(() => {});
  }, [product.id]);

  return (
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

      <AddToCartButton
        label={product.stock > 0 ? "Add to Cart" : "Out of Stock"}
        onAdd={() => {
          if (product.stock <= 0) return;
          addItem(
            {
              productId: product.id,
              slug: product.slug,
              title: product.title,
              imageUrl: product.image_url,
              price: product.retail_price,
            },
            quantity
          );
        }}
      />
    </div>
  );
}
