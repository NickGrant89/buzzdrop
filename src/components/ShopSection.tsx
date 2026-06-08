"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/db";
import { formatCategoryDisplay, getShopCategories } from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";
import { Sparkles } from "lucide-react";

type ShopSectionProps = {
  products: Product[];
  rawCategories: string[];
};

export function ShopSection({ products, rawCategories }: ShopSectionProps) {
  const categories = useMemo(() => getShopCategories(rawCategories), [rawCategories]);
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!active) return products;
    return products.filter((p) => formatCategoryDisplay(p.category) === active);
  }, [products, active]);

  return (
    <section id="shop" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Shop all</h2>
        <p className="mt-1 text-zinc-500">Fresh finds updated regularly</p>
      </div>

      {categories.length > 1 && (
        <div className="mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CategoryPill
              label="All"
              active={active === null}
              onClick={() => setActive(null)}
            />
            {categories.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                active={active === cat}
                onClick={() => setActive(cat)}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 py-24 text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-amber-500/50" />
          <h3 className="text-xl font-semibold text-white">No products in this category</h3>
          <p className="mt-2 text-zinc-500">Try another category or browse all items.</p>
          <button
            type="button"
            onClick={() => setActive(null)}
            className="mt-6 text-sm font-medium text-amber-400 hover:text-amber-300"
          >
            View all products
          </button>
        </div>
      ) : (
        <>
          {active && (
            <p className="mb-4 text-sm text-zinc-500">
              Showing {filtered.length} {filtered.length === 1 ? "product" : "products"} in{" "}
              <span className="text-zinc-300">{active}</span>
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20"
          : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}
