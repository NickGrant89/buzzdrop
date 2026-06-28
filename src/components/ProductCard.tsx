import Link from "next/link";
import Image from "next/image";
import { Flame } from "lucide-react";
import type { Product } from "@/lib/db";
import { getProductDisplayPrice } from "@/lib/automation/pricing";
import { formatCategoryDisplay } from "@/lib/categories";
import { formatPrice } from "@/lib/utils";
import { SHIPPING_BADGE } from "@/lib/store-copy";

export function ProductCard({ product }: { product: Product }) {
  const isHot = product.trend_score >= 90;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 transition hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5"
    >
      {isHot && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white">
          <Flame className="h-3 w-3" />
          Hot
        </div>
      )}

      <div className="relative aspect-square overflow-hidden bg-zinc-800">
        <Image
          src={product.image_url}
          alt={product.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="mb-1 text-xs font-medium uppercase tracking-wider text-amber-400/80">
          {formatCategoryDisplay(product.category)}
        </span>
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-white group-hover:text-amber-200">
          {product.title}
        </h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-bold text-white">
            {formatPrice(getProductDisplayPrice(product))}
          </span>
          <span className="text-xs text-zinc-500">{SHIPPING_BADGE}</span>
        </div>
      </div>
    </Link>
  );
}
