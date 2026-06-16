import type { Product } from "./db";
import { db } from "./db";

export type ProductFaq = { q: string; a: string };

export function getProductSeoTitle(product: Product): string {
  return product.seo_title?.trim() || product.title;
}

export function getProductSeoDescription(product: Product): string {
  const custom = product.seo_description?.trim();
  if (custom) return custom.slice(0, 160);
  return product.description.slice(0, 160);
}

export function defaultProductFaqs(product: Product): ProductFaq[] {
  return [
    {
      q: `How long does UK delivery take?`,
      a: "Free UK delivery on every order. Most items arrive within 5–15 working days.",
    },
    {
      q: "Can I return this if I'm not happy?",
      a: "Yes — we offer a 14-day returns policy. See our returns page for full details.",
    },
    {
      q: `Is ${product.title} in stock?`,
      a:
        product.stock > 0
          ? `Yes — ${product.stock} available now with secure Stripe checkout.`
          : "This item is currently out of stock. Check back soon or browse similar products.",
    },
  ];
}

export function parseProductFaqs(raw: string | null | undefined): ProductFaq[] | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const faqs = parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const q = "q" in item && typeof item.q === "string" ? item.q.trim() : "";
        const a = "a" in item && typeof item.a === "string" ? item.a.trim() : "";
        return q && a ? { q, a } : null;
      })
      .filter((item): item is ProductFaq => item !== null);
    return faqs.length > 0 ? faqs : null;
  } catch {
    return null;
  }
}

export function getProductFaqs(product: Product): ProductFaq[] {
  return parseProductFaqs(product.seo_faqs) ?? defaultProductFaqs(product);
}

export function updateProductSeo(
  productId: string,
  fields: { seoTitle?: string; seoDescription?: string; seoFaqs?: string }
): { ok: boolean; message: string } {
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId) as
    | { id: string }
    | undefined;

  if (!product) {
    return { ok: false, message: "Product not found" };
  }

  if (fields.seoFaqs !== undefined && fields.seoFaqs.trim()) {
    const parsed = parseProductFaqs(fields.seoFaqs);
    if (!parsed) {
      return {
        ok: false,
        message: 'FAQs must be JSON like [{"q":"Question?","a":"Answer."}]',
      };
    }
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE products SET
      seo_title = ?,
      seo_description = ?,
      seo_faqs = ?,
      updated_at = ?
     WHERE id = ?`
  ).run(
    fields.seoTitle ?? "",
    fields.seoDescription ?? "",
    fields.seoFaqs ?? "",
    now,
    productId
  );

  return { ok: true, message: "SEO saved" };
}
