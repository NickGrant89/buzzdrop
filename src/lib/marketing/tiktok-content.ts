import type { Product } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";
import { formatPrice } from "@/lib/utils";

export type TikTokHook = {
  label: string;
  openingText: string;
  shotNotes: string;
};

export type TikTokManualPost = {
  heroIndex: number;
  productId: string;
  title: string;
  slug: string;
  priceLabel: string;
  productUrl: string;
  videoFilename: string;
  videoLocalPath: string;
  caption: string;
  hashtags: string;
  fullPost: string;
  pinComment: string;
  bioLink: string;
  hooks: TikTokHook[];
};

type ProductTheme = "noteboard" | "cooler" | "lamp" | "beauty" | "kitchen" | "generic";

function detectTheme(slug: string, title: string): ProductTheme {
  const text = `${slug} ${title}`.toLowerCase();
  if (/note|message.?board|led.*board/.test(text)) return "noteboard";
  if (/cool|fan|air.?condition/.test(text)) return "cooler";
  if (/lamp|speaker|bluetooth|g-shaped/.test(text)) return "lamp";
  if (/hair.?removal|crystal|beauty|skin/.test(text)) return "beauty";
  if (/washer|sink|spray|kitchen|cup/.test(text)) return "kitchen";
  return "generic";
}

function videoAsset(slug: string) {
  const filename = `${slug}-ad.mp4`;
  return {
    videoFilename: filename,
    videoLocalPath: `public/social/videos/${filename}`,
  };
}

function baseHashtags(theme: ProductTheme): string {
  const extra =
    theme === "noteboard"
      ? "#giftideas #bedroomdecor #led #neon"
      : theme === "cooler"
        ? "#summer #desksetup #ukheat #gadget"
        : theme === "lamp"
          ? "#roomdecor #bluetooth #ledlamp #aesthetic"
          : theme === "beauty"
            ? "#beautyhacks #skincare #hairremoval #selfcare"
            : theme === "kitchen"
              ? "#kitchenhacks #homeupgrade #cleaning #ukhome"
              : "#gadgets #trending";

  return `#buzzdrop #uktiktok #fyp #viral #freedelivery ${extra}`.trim();
}

function buildCaption(product: Product, theme: ProductTheme, priceLabel: string): string {
  const title = product.title.length > 60 ? product.title.slice(0, 57) + "…" : product.title;

  switch (theme) {
    case "noteboard":
      return [
        "The viral LED note board everyone's putting on their bedside table 👀",
        "",
        "Write any message — it glows like a mini neon sign ✨",
        "",
        `Free UK delivery · ${priceLabel}`,
      ].join("\n");
    case "cooler":
      return [
        "UK summer desk hack — this tiny cooler actually works 🧊",
        "",
        "Quiet, portable, and perfect for home office or bedside.",
        "",
        `Free UK delivery · ${priceLabel}`,
      ].join("\n");
    case "lamp":
      return [
        "Room upgrade for less than a takeaway 🎵",
        "",
        "G-shaped LED lamp + Bluetooth speaker in one.",
        "",
        `Free UK delivery · ${priceLabel}`,
      ].join("\n");
    case "beauty":
      return [
        "The beauty hack TikTok won't stop talking about ✨",
        "",
        "Gentle crystal hair removal — smooth skin at home.",
        "",
        `Free UK delivery · ${priceLabel}`,
      ].join("\n");
    case "kitchen":
      return [
        "Why didn't I buy this for my kitchen sooner?",
        "",
        "High-pressure cup washer — cleans glasses in seconds.",
        "",
        `Free UK delivery · ${priceLabel}`,
      ].join("\n");
    default:
      return [
        `🔥 ${title}`,
        "",
        "Trending at BuzzDrop — free UK delivery 🇬🇧",
        "",
        `Only ${priceLabel}`,
      ].join("\n");
  }
}

function buildHooks(theme: ProductTheme, priceLabel: string): TikTokHook[] {
  switch (theme) {
    case "noteboard":
      return [
        {
          label: "Gift hook",
          openingText: "£23 gift that looks £50",
          shotNotes: "Write “Good night ❤️”, turn lights off to show glow",
        },
        {
          label: "Viral hook",
          openingText: "Why is everyone buying this?",
          shotNotes: "Unbox, plug in USB, show message changing",
        },
        {
          label: "Bedroom hook",
          openingText: "POV: your bedside table upgrade",
          shotNotes: "Wide shot → close-up glow → price on screen",
        },
      ];
    case "cooler":
      return [
        {
          label: "Problem hook",
          openingText: "UK summer desk too hot?",
          shotNotes: "Show sweaty setup → turn cooler on → relief reaction",
        },
        {
          label: "Desk hack",
          openingText: "£28 desk upgrade you need",
          shotNotes: "Place on desk, mist/airflow visible, quiet room audio",
        },
        {
          label: "Comparison",
          openingText: "Cheaper than a fan + looks better",
          shotNotes: "Side by side with basic fan, show size & price",
        },
      ];
    case "lamp":
      return [
        {
          label: "Aesthetic",
          openingText: "The lamp TikTok made me buy",
          shotNotes: "Dark room, colour change, music playing from speaker",
        },
        {
          label: "Gift",
          openingText: "Perfect teen room gift",
          shotNotes: "Show G-shape, Bluetooth pairing, price overlay",
        },
        {
          label: "Multi-use",
          openingText: "Lamp + speaker for one price",
          shotNotes: "Light on → play music → show product link comment",
        },
      ];
    case "beauty":
      return [
        {
          label: "Smooth skin",
          openingText: "No more razor bumps",
          shotNotes: "Close-up glide on skin, before/after hint",
        },
        {
          label: "TikTok hack",
          openingText: "Crystal hair removal is going viral",
          shotNotes: "Unbox, demo on arm/leg, show price",
        },
        {
          label: "Budget beauty",
          openingText: `Smooth skin for ${priceLabel}`,
          shotNotes: "Product in hand, natural light, CTA on screen",
        },
      ];
    case "kitchen":
      return [
        {
          label: "Kitchen hack",
          openingText: "Cleans cups in 3 seconds",
          shotNotes: "Dirty glass → spray washer → sparkling result",
        },
        {
          label: "Barista home",
          openingText: "Coffee shop clean at home",
          shotNotes: "Mugs lined up, quick rinse demo",
        },
        {
          label: "Gift",
          openingText: "Best kitchen gadget under £40",
          shotNotes: "Wide kitchen shot → close-up spray → price",
        },
      ];
    default:
      return [
        {
          label: "Discovery",
          openingText: "Found this on BuzzDrop",
          shotNotes: `Show product, price ${priceLabel}, CTA link in bio`,
        },
        {
          label: "Unbox",
          openingText: "Let's see if it's worth the hype",
          shotNotes: "Quick unbox + first impression",
        },
        {
          label: "Deal",
          openingText: "Free UK delivery on this",
          shotNotes: "Product hero shot + price on screen",
        },
      ];
  }
}

export function buildTikTokManualPost(
  product: Product,
  heroIndex: number
): TikTokManualPost {
  const siteUrl = getSiteUrl();
  const productUrl = `${siteUrl}/product/${product.slug}`;
  const priceLabel = formatPrice(product.retail_price);
  const theme = detectTheme(product.slug, product.title);
  const caption = buildCaption(product, theme, priceLabel);
  const hashtags = baseHashtags(theme);
  const { videoFilename, videoLocalPath } = videoAsset(product.slug);

  return {
    heroIndex,
    productId: product.id,
    title: product.title,
    slug: product.slug,
    priceLabel,
    productUrl,
    videoFilename,
    videoLocalPath,
    caption,
    hashtags,
    fullPost: `${caption}\n\n${hashtags}`,
    pinComment: `Shop here → ${productUrl}`,
    bioLink: siteUrl.replace(/^https?:\/\//, ""),
    hooks: buildHooks(theme, priceLabel),
  };
}

export function buildTikTokManualPosts(
  products: Product[],
  limit = 3
): TikTokManualPost[] {
  return products.slice(0, limit).map((product, i) => buildTikTokManualPost(product, i + 1));
}
