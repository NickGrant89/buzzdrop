import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreLayout } from "@/components/StoreLayout";
import { ProductDetailClient } from "./ProductDetailClient";
import { getProductBySlug } from "@/lib/products";
import { formatCategoryDisplay } from "@/lib/categories";
import { buildPageMetadata, productJsonLd } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";
import { Truck, Shield, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return buildPageMetadata({ title: "Product not found", noIndex: true });

  return buildPageMetadata({
    title: product.title,
    description: product.description.slice(0, 160),
    path: `/product/${product.slug}`,
    image: product.image_url,
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) notFound();

  const categoryLabel = formatCategoryDisplay(product.category);

  return (
    <StoreLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link
          href="/#shop"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          <div>
            <span className="text-sm font-medium uppercase tracking-wider text-amber-400">
              {categoryLabel}
            </span>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{product.title}</h1>

            <div className="mt-4 flex items-center gap-4">
              <span className="text-3xl font-bold text-white">
                {formatPrice(product.retail_price)}
              </span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                Free UK delivery
              </span>
            </div>

            <p className="mt-6 leading-relaxed text-zinc-400">{product.description}</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 p-4">
                <Truck className="mb-2 h-5 w-5 text-amber-400" />
                <p className="text-sm font-medium text-white">Free shipping</p>
                <p className="text-xs text-zinc-500">5–15 working days</p>
              </div>
              <div className="rounded-xl border border-zinc-800 p-4">
                <Shield className="mb-2 h-5 w-5 text-amber-400" />
                <p className="text-sm font-medium text-white">14-day returns</p>
                <p className="text-xs text-zinc-500">
                  <Link href="/returns" className="hover:text-zinc-300">
                    See policy
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-zinc-500">
              {product.stock > 0 ? (
                <span className="text-emerald-400">{product.stock} in stock</span>
              ) : (
                <span className="text-red-400">Out of stock</span>
              )}
            </p>

            <div className="mt-8">
              <ProductDetailClient product={product} />
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
