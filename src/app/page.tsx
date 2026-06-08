import Image from "next/image";
import Link from "next/link";
import { StoreLayout } from "@/components/StoreLayout";
import { ProductCard } from "@/components/ProductCard";
import { ShopSection } from "@/components/ShopSection";
import { getActiveProducts, getCategories } from "@/lib/products";
import { syncTrendingProducts } from "@/lib/automation/trend-scraper";
import { isCjConfigured } from "@/lib/config";
import { buildPageMetadata, organizationJsonLd } from "@/lib/seo";
import { ArrowRight, Shield, Truck, Sparkles, Star } from "lucide-react";

export const metadata = buildPageMetadata({
  description:
    "Shop viral trending products in the UK. Free delivery, secure checkout, and 14-day returns on every order.",
  path: "/",
});

export const dynamic = "force-dynamic";

async function ensureProducts() {
  if (getActiveProducts(1).length > 0) return;

  if (!isCjConfigured()) return;

  try {
    await syncTrendingProducts();
  } catch {
    /* show empty storefront — no admin messaging on public page */
  }
}

export default async function HomePage() {
  await ensureProducts();
  const products = getActiveProducts();
  const categories = getCategories();
  const featured = products.slice(0, 4);
  const heroProduct = products[0];

  return (
    <StoreLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-zinc-950 to-zinc-950" />
        <div className="absolute -right-32 top-20 h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -left-32 bottom-0 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-amber-400">
              <Sparkles className="h-4 w-4" />
              New viral drops every week
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              The products everyone&apos;s{" "}
              <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                talking about
              </span>
            </h1>
            <p className="mb-8 max-w-lg text-lg leading-relaxed text-zinc-400">
              Discover trending gadgets, beauty must-haves, and home favourites — handpicked
              for the UK, with free delivery on every order.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="#shop"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-orange-400"
              >
                Shop now
                <ArrowRight className="h-4 w-4" />
              </Link>
              {featured[0] && (
                <Link
                  href={`/product/${featured[0].slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-8 py-3.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                >
                  See bestseller
                </Link>
              )}
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-zinc-500">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                Curated viral picks
              </span>
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-400" />
                Free UK delivery
              </span>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                Secure checkout
              </span>
            </div>
          </div>

          {heroProduct ? (
            <Link
              href={`/product/${heroProduct.slug}`}
              className="group relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-amber-500/10 lg:max-w-none"
            >
              <Image
                src={heroProduct.image_url}
                alt={heroProduct.title}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="mb-2 inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  Trending now
                </span>
                <p className="line-clamp-2 text-lg font-semibold text-white">{heroProduct.title}</p>
              </div>
            </Link>
          ) : (
            <div className="flex aspect-square w-full max-w-md items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/50 lg:max-w-none">
              <p className="text-zinc-500">New drops landing soon</p>
            </div>
          )}
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-zinc-800/80 bg-zinc-900/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-zinc-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { title: "Free UK delivery", desc: "On every single order" },
            { title: "3–5 working days", desc: "Fast dispatch from UK stock" },
            { title: "Easy returns", desc: "14-day return policy" },
          ].map(({ title, desc }) => (
            <div key={title} className="px-6 py-5 text-center sm:py-6">
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-sm text-zinc-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Going viral</h2>
              <p className="mt-1 text-zinc-500">Our most popular picks this week</p>
            </div>
            <Link
              href="#shop"
              className="hidden items-center gap-1 text-sm font-medium text-amber-400 hover:text-amber-300 sm:flex"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <ShopSection products={products} rawCategories={categories} />

      {/* Why BuzzDrop — customer benefits only */}
      <section className="border-t border-zinc-800 bg-zinc-900/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Why shop BuzzDrop?</h2>
            <p className="mt-2 text-zinc-500">
              We hunt down the products blowing up on TikTok and Instagram so you don&apos;t have to.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Viral before mainstream",
                desc: "Get the products everyone's sharing before they sell out on the high street.",
              },
              {
                title: "Picked for the UK",
                desc: "Every item ships from UK stock — no long waits, no surprise customs fees.",
              },
              {
                title: "Prices that make sense",
                desc: "Trending doesn't have to mean overpriced. Great products at fair prices.",
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 text-center"
              >
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
