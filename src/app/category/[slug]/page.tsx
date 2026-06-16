import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreLayout } from "@/components/StoreLayout";
import { ProductCard } from "@/components/ProductCard";
import {
  getCategories,
  getProductsByCategoryLabel,
  resolveCategorySlug,
} from "@/lib/products";
import { categorySlug, getShopCategories } from "@/lib/categories";
import { buildPageMetadata, breadcrumbJsonLd, categoryPageDescription } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = resolveCategorySlug(slug);
  if (!category) {
    return buildPageMetadata({ title: "Category not found", noIndex: true });
  }

  const products = getProductsByCategoryLabel(category.label);
  return buildPageMetadata({
    title: `${category.label} — Trending UK Finds`,
    description: categoryPageDescription(category.label, products.length),
    path: `/category/${category.slug}`,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = resolveCategorySlug(slug);
  if (!category) notFound();

  const products = getProductsByCategoryLabel(category.label);
  const allCategories = getShopCategories(getCategories());

  return (
    <StoreLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: category.label, path: `/category/${category.slug}` },
            ])
          ),
        }}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link
          href="/#shop"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>

        <h1 className="text-3xl font-bold text-white sm:text-4xl">{category.label}</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          {categoryPageDescription(category.label, products.length)}
        </p>

        {allCategories.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {allCategories.map((label) => {
              const href = `/category/${categorySlug(label)}`;
              const active = label === category.label;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {products.length === 0 ? (
          <p className="mt-12 text-center text-zinc-500">No products in this category right now.</p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
