import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreLayout } from "@/components/StoreLayout";
import { ProductDetailClient } from "./ProductDetailClient";
import { ProductHeroMedia } from "@/components/ProductHeroMedia";
import { ProductTrustStrip } from "@/components/ProductTrustStrip";
import { getProductBySlug } from "@/lib/products";
import { formatCategoryDisplay, categorySlug } from "@/lib/categories";
import { getProductFaqs, getProductSeoDescription, getProductSeoTitle } from "@/lib/product-seo";
import { getProductLanding, getProductDisplayPrice } from "@/lib/product-landing";
import { buildPageMetadata, productJsonLd, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";
import { Truck, Shield, ArrowLeft, Gift, Check } from "lucide-react";

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
    title: getProductSeoTitle(product),
    description: getProductSeoDescription(product),
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

  const landing = getProductLanding(slug);
  const displayPrice = getProductDisplayPrice(product);
  const categoryLabel = formatCategoryDisplay(product.category);
  const categoryPath = `/category/${categorySlug(categoryLabel)}`;
  const faqs = landing?.seoFaqs ?? getProductFaqs(product);
  const displayTitle = landing?.displayTitle ?? product.title;
  const description = landing?.dbDescription ?? product.description;

  return (
    <StoreLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: categoryLabel, path: categoryPath },
              { name: displayTitle, path: `/product/${product.slug}` },
            ])
          ),
        }}
      />
      <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 ${landing ? "pb-28 md:pb-8" : ""}`}>
        <Link
          href="/#shop"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>

        <div className="grid gap-10 lg:grid-cols-2">
          <ProductHeroMedia
            imageUrl={product.image_url}
            alt={displayTitle}
            videoUrl={landing?.videoUrl}
            posterUrl={landing?.posterUrl}
          />

          <div>
            <span className="text-sm font-medium uppercase tracking-wider text-amber-400">
              <Link href={categoryPath} className="hover:text-amber-300">
                {categoryLabel}
              </Link>
            </span>

            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{displayTitle}</h1>

            {landing?.tagline ? (
              <p className="mt-3 text-lg leading-relaxed text-zinc-300">{landing.tagline}</p>
            ) : null}

            <div className="mt-5">
              <ProductTrustStrip />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-bold text-white">{formatPrice(displayPrice)}</span>
              {landing?.compareAtPrice && landing.compareAtPrice > displayPrice ? (
                <span className="text-lg text-zinc-500 line-through">
                  {formatPrice(landing.compareAtPrice)}
                </span>
              ) : null}
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                Free UK delivery
              </span>
            </div>

            {landing?.promoBadge ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300">
                <Gift className="h-4 w-4 shrink-0" />
                {landing.promoBadge}
              </p>
            ) : null}

            <p className="mt-3 text-sm text-zinc-400">
              Secure checkout via Stripe · Card &amp; Apple Pay ·{" "}
              <a href="mailto:support@buzzdrop.co.uk" className="text-zinc-300 hover:text-white">
                support@buzzdrop.co.uk
              </a>
            </p>

            {landing ? (
              <div className="mt-6">
                <ProductDetailClient
                  product={product}
                  displayPrice={displayPrice}
                  stickyCheckout
                />
              </div>
            ) : null}

            {landing?.bullets?.length ? (
              <ul className="mt-6 space-y-2">
                {landing.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="mt-6 leading-relaxed text-zinc-400">{description}</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 p-4">
                <Truck className="mb-2 h-5 w-5 text-amber-400" />
                <p className="text-sm font-medium text-white">Free UK shipping</p>
                <p className="text-xs text-zinc-500">Usually arrives within 7–10 working days</p>
              </div>
              <div className="rounded-xl border border-zinc-800 p-4">
                <Shield className="mb-2 h-5 w-5 text-amber-400" />
                <p className="text-sm font-medium text-white">14-day returns</p>
                <p className="text-xs text-zinc-500">
                  <Link href="/returns" className="hover:text-zinc-300">
                    UK support · See policy
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-zinc-500">
              {product.stock > 0 ? (
                <span className="text-emerald-400">{product.stock} in stock — ships from UK warehouse</span>
              ) : (
                <span className="text-red-400">Out of stock</span>
              )}
            </p>

            {!landing ? (
              <div className="mt-8">
                <ProductDetailClient product={product} displayPrice={displayPrice} />
              </div>
            ) : null}

            <div className="mt-12 border-t border-zinc-800 pt-8">
              <h2 className="text-lg font-semibold text-white">Frequently asked questions</h2>
              <dl className="mt-4 space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.q} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <dt className="font-medium text-white">{faq.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{faq.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
