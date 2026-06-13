import type { Product } from "@/lib/db";
import { formatCategoryDisplay } from "@/lib/categories";
import { formatPrice } from "@/lib/utils";

export type TikTokManualPost = {
  hook: string;
  caption: string;
  hashtags: string[];
  hashtagsLine: string;
  onScreenText: string[];
  videoScript: string;
  soundSuggestion: string;
  pinnedComment: string;
  seoKeywords: string[];
  checklist: string[];
};

type ProductAngle = "beauty" | "home" | "kitchen" | "gift" | "gadget";

function detectAngle(title: string, category: string): ProductAngle {
  const t = `${title} ${category}`.toLowerCase();
  if (/hair|skin|beauty|crystal|eraser|groom/.test(t)) return "beauty";
  if (/cup|washer|sink|faucet|bar|kitchen/.test(t)) return "kitchen";
  if (/led|light|board|message|night|decor|lamp/.test(t)) return "home";
  if (/gift|holiday|birthday/.test(t)) return "gift";
  return "gadget";
}

function shortTitle(title: string, max = 48): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function angleHooks(angle: ProductAngle, price: string): string[] {
  const hooks: Record<ProductAngle, string[]> = {
    beauty: [
      "I stopped buying razors after finding this 👀",
      "This £16 gadget replaced my hair removal routine",
      "TikTok made me try it — actually works",
    ],
    kitchen: [
      "Every home bar needs this in 2026",
      "The cup washer I didn't know I needed",
      "POV: you never hand-wash glasses again",
    ],
    home: [
      "The LED note board that went viral for a reason",
      "Leave sweet notes that actually glow ✨",
      "Room upgrade under £25 — link in bio",
    ],
    gift: [
      "Gift idea they'll actually use every day",
      `Under ${price} and looks way more expensive`,
      "Perfect last-minute gift that still feels personal",
    ],
    gadget: [
      "Amazon find? No — UK delivery, link in bio",
      "Things I didn't know I needed until now",
      `Only ${price} · free UK delivery 🇬🇧`,
    ],
  };
  return hooks[angle];
}

function angleHashtags(angle: ProductAngle, category: string): string[] {
  const cat = category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  const base = [
    "#tiktokmademebuyit",
    "#uktiktok",
    "#amazonfinds",
    "#buzzdrop",
    "#fyp",
    "#viralproducts",
  ];
  const extra: Record<ProductAngle, string[]> = {
    beauty: ["#beautytok", "#hairremoval", "#skincare", "#beautyhacks", "#selfcare"],
    kitchen: ["#kitchenhacks", "#homebar", "#kitchengadgets", "#cleaninghacks", "#homeupgrade"],
    home: ["#roomdecor", "#ledlights", "#homedecor", "#aestheticroom", "#giftideas"],
    gift: ["#giftideas", "#ukgifts", "#birthdaygift", "#christmasgift", "#uniquegifts"],
    gadget: ["#gadgets", "#techfinds", "#lifehacks", "#musthave", "#ukshopping"],
  };
  const tags = [...extra[angle], ...base];
  if (cat.length >= 3) tags.unshift(`#${cat}`);
  return [...new Set(tags)].slice(0, 12);
}

function buildVideoScript(
  product: Product,
  hook: string,
  price: string,
  productUrl: string,
): string {
  const name = shortTitle(product.title, 56);
  return [
    `[0–3s] HOOK (on camera or text overlay): "${hook}"`,
    `[3–8s] Show product + unbox or demo`,
    `[8–18s] "${name} — ${product.description.slice(0, 120).trim()}${product.description.length > 120 ? "…" : ""}"`,
    `[18–25s] "Only ${price}, free UK delivery. Link in bio or tap the product tag."`,
    `[25–30s] CTA on screen: SHOP NOW → ${productUrl}`,
  ].join("\n");
}

export function buildTikTokManualPost(
  product: Product,
  productUrl: string,
): TikTokManualPost {
  const category = formatCategoryDisplay(product.category);
  const price = formatPrice(product.retail_price);
  const angle = detectAngle(product.title, category);
  const hook = angleHooks(angle, price)[0];
  const hashtags = angleHashtags(angle, category);
  const hashtagsLine = hashtags.join(" ");

  const caption = [
    hook,
    "",
    shortTitle(product.title),
    "",
    product.description.trim(),
    "",
    `💷 ${price} · Free UK delivery`,
    "🔗 Link in bio",
    "",
    hashtagsLine,
  ].join("\n");

  const onScreenText = [hook, price, "Link in bio 👆", "Free UK delivery 🇬🇧"];

  const soundSuggestion =
    angle === "beauty"
      ? "Trending soft beat or 'get ready with me' audio"
      : angle === "kitchen"
        ? "Satisfying / ASMR cleaning sound or upbeat kitchen hack audio"
        : "Trending 'oh no' or aesthetic room-transform audio";

  const pinnedComment = `Tap the link for ${shortTitle(product.title, 40)} → ${productUrl}`;

  const seoKeywords = [
    shortTitle(product.title, 60),
    category,
    "UK delivery",
    "TikTok shop",
    angle === "beauty" ? "hair removal" : angle === "kitchen" ? "kitchen gadget" : "room decor",
  ];

  const checklist = [
    "Film vertical 9:16 (1080×1920)",
    "Add product link / TikTok Shop tag before posting",
    "Paste caption below (or trim hashtags if over limit)",
    "Pin the comment with your product URL",
    "Post 18:00–21:00 UK for best reach",
    "Reply to first 5 comments within 1 hour",
  ];

  return {
    hook,
    caption,
    hashtags,
    hashtagsLine,
    onScreenText,
    videoScript: buildVideoScript(product, hook, price, productUrl),
    soundSuggestion,
    pinnedComment,
    seoKeywords,
    checklist,
  };
}
