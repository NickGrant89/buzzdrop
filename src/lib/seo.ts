import type { Metadata } from "next";
import type { Product } from "./db";
import { getSocialLinks } from "./social-links";

const siteName = "BuzzDrop";
const defaultDescription =
  "Shop viral trending products in the UK. Free delivery, secure checkout, and 14-day returns on every order.";

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://buzzdrop.co.uk").replace(/\/$/, "");
}

export const siteConfig = {
  name: siteName,
  description: defaultDescription,
  locale: "en_GB",
  twitterHandle: "@buzzdropuk",
};

export function buildPageMetadata({
  title,
  description,
  path = "",
  image,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${getSiteUrl()}${path}`;
  const pageTitle = title ? `${title} | ${siteName}` : `${siteName} — Viral Finds, Shipped Fast`;
  const pageDescription = description ?? defaultDescription;
  const ogImage = image ?? `${getSiteUrl()}/og-image.png`;
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

  return {
    title: pageTitle,
    description: pageDescription,
    metadataBase: new URL(getSiteUrl()),
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url,
      siteName,
      title: pageTitle,
      description: pageDescription,
      images: [{ url: ogImage, width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [ogImage],
    },
  };
}

export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.image_url,
    sku: product.supplier_sku,
    brand: { "@type": "Brand", name: "BuzzDrop" },
    offers: {
      "@type": "Offer",
      url: `${getSiteUrl()}/product/${product.slug}`,
      priceCurrency: "GBP",
      price: product.retail_price.toFixed(2),
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "BuzzDrop" },
    },
  };
}

export function faqJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${getSiteUrl()}${item.path}`,
    })),
  };
}

export function categoryPageDescription(label: string, productCount: number): string {
  return `Shop ${label.toLowerCase()} at BuzzDrop — ${productCount} trending ${productCount === 1 ? "find" : "finds"} with free UK delivery, secure checkout, and 14-day returns.`;
}

export function organizationJsonLd() {
  const social = getSocialLinks().map((link) => link.href);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BuzzDrop",
    url: getSiteUrl(),
    logo: `${getSiteUrl()}/icon.svg`,
    sameAs: social,
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@buzzdrop.co.uk",
      contactType: "customer service",
      areaServed: "GB",
    },
  };
}
