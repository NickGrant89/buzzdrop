import type { ProductFaq } from "./product-seo";
import { getProductDisplayPrice } from "./automation/pricing";
import { getSiteUrl } from "./seo";

export { getProductDisplayPrice };

/** Hero product slugs with conversion-focused landing page content. */
export const NOTE_BOARD_SLUG = "note-board-creative-led-night-light-usb-message-953728";

export type ProductLanding = {
  slug: string;
  displayTitle: string;
  tagline: string;
  promoBadge: string;
  compareAtPrice?: number;
  bullets: string[];
  videoUrl: string;
  posterUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoFaqs: ProductFaq[];
  dbDescription: string;
};

function mediaUrlsForSlug(slug: string) {
  const base = getSiteUrl();
  return {
    videoUrl: `${base}/social/videos/${slug}-ad.mp4`,
    posterUrl: `${base}/social/videos/${slug}-slide.jpg`,
  };
}

function buildNoteBoardLanding(): ProductLanding {
  const media = mediaUrlsForSlug(NOTE_BOARD_SLUG);
  return {
    slug: NOTE_BOARD_SLUG,
    displayTitle: "LED Note Board Night Light",
    tagline: "The viral bedside message board — write any text and it glows like mini neon.",
    promoBadge: "Free UK delivery + gift-ready packaging",
    bullets: [
      "Write any message — names, quotes, reminders, or jokes",
      "Soft LED glow — perfect bedside lamp or desk decor",
      "USB powered — plug in and go, no batteries",
      "Gift-ready box — ideal for birthdays, bedrooms & TikTok fans",
    ],
    ...media,
    seoTitle: "LED Note Board Night Light — Free UK Delivery | BuzzDrop",
    seoDescription:
      "Write any message on this viral LED note board. USB powered, gift-ready packaging, free UK delivery & secure Stripe checkout. £22.99.",
    dbDescription:
      "Creative USB LED message board that lights up any text you write — like a mini neon sign for your bedside table, desk, or shelf. Transparent acrylic panel with a warm glow effect. USB powered (cable included). Arrives in gift-ready packaging. Free UK delivery.",
    seoFaqs: [
      {
        q: "How long does UK delivery take?",
        a: "Free UK delivery on every order. Most Note Board orders arrive within 7–10 working days.",
      },
      {
        q: "Is it a good gift?",
        a: "Yes — it arrives in gift-ready packaging and is one of the most shared bedroom decor finds on TikTok.",
      },
      {
        q: "How do I power it?",
        a: "USB powered — plug into a phone charger, laptop, or USB socket. No batteries needed.",
      },
      {
        q: "Can I return it if I'm not happy?",
        a: "Yes — 14-day returns. Email support@buzzdrop.co.uk and we'll help with a return or exchange.",
      },
      {
        q: "Is checkout secure?",
        a: "Yes — all payments are processed securely via Stripe (card & Apple Pay). BuzzDrop is UK-based with support at support@buzzdrop.co.uk.",
      },
    ],
  };
}

export function getProductLanding(slug: string): ProductLanding | null {
  if (slug === NOTE_BOARD_SLUG) return buildNoteBoardLanding();
  return null;
}
