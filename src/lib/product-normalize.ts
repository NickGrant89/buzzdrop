/** Clean CJ product copy into shopper-friendly titles, descriptions, and slugs. */

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const BRAND_PREFIXES =
  /^(CJEER|Phomemo|Tuya|Baseus|Ugreen|Anker|Xiaomi)\s+/i;

const LEADING_FILLER = /^(New|Hot|Best|Top|Latest|Creative|Multifunctional|Portable|Mini|Small)\s+/i;

const TRAILING_FILLER =
  /\s+(For Home Use|Home Use|Wireless|Bluetooth-compatible|Bluetooth Compatible|\d+)\s*$/i;

const TYPO_FIXES: [RegExp, string][] = [
  [/\bSpeake\b/gi, "Speaker"],
  [/\bAcessories\b/gi, "Accessories"],
  [/\bLed\b/g, "LED"],
  [/\bUsb\b/g, "USB"],
];

const CANONICAL_CATEGORIES: Record<string, string> = {
  gadgets: "Gadgets",
  trending: "Trending",
  home: "Home",
  "home & garden": "Home",
  "home, garden & furniture": "Home",
  kitchen: "Kitchen",
  "kitchen, dining & bar": "Kitchen",
  beauty: "Beauty & Health",
  "beauty & health": "Beauty & Health",
  "health, beauty & hair": "Beauty & Health",
  "health & beauty": "Beauty & Health",
  fashion: "Fashion",
  "women's clothing": "Fashion",
  "men's clothing": "Fashion",
  "phones & accessories": "Phone Accessories",
  "phone accessories": "Phone Accessories",
  "consumer electronics": "Electronics",
  electronics: "Electronics",
  "computer & office": "Tech & Office",
  "tech & office": "Tech & Office",
  "sports & outdoors": "Sports & Outdoors",
  pet: "Pet",
  "pet supplies": "Pet",
  auto: "Auto",
  automotive: "Auto",
  "jewelry & watches": "Jewellery",
  jewelery: "Jewellery",
};

function decodeHtmlEntities(text: string): string {
  let out = text;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    out = out.replaceAll(entity, char);
  }
  return out.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(text: string): string {
  const small = new Set(["a", "an", "and", "for", "in", "of", "the", "to", "with"]);
  return text
    .split(" ")
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export function normalizeProductTitle(raw: string): string {
  let title = decodeHtmlEntities(stripHtml(raw)).replace(BRAND_PREFIXES, "");
  title = title.replace(/\s+/g, " ").trim();

  // Strip repeated leading filler words (max 3 passes)
  for (let i = 0; i < 3; i++) {
    const next = title.replace(LEADING_FILLER, "");
    if (next === title) break;
    title = next.trim();
  }

  for (const [pattern, replacement] of TYPO_FIXES) {
    title = title.replace(pattern, replacement);
  }

  // Drop keyword-stuffing tails after comma when very long
  if (title.length > 80 && title.includes(",")) {
    title = title.split(",")[0]!.trim();
  }

  title = titleCase(title);

  // Trim dangling filler at end
  for (let i = 0; i < 2; i++) {
    const next = title.replace(TRAILING_FILLER, "");
    if (next === title) break;
    title = next.trim();
  }

  return truncateAtWord(title, 65);
}

export function normalizeProductDescription(raw: string, title: string): string {
  let desc = decodeHtmlEntities(stripHtml(raw));
  desc = desc.replace(/^Overview:\s*/i, "");
  desc = desc.replace(/^\d+\.\s*/gm, "");
  desc = desc.replace(/\s+/g, " ").trim();

  // Prefer first 1–2 sentences over bullet spam
  const sentences = desc.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [];
  if (sentences.length > 0) {
    desc = sentences.slice(0, 2).join(" ");
  }

  if (desc.length < 20) {
    const shortTitle = normalizeProductTitle(title);
    desc = `${shortTitle}. Free UK delivery — trending pick on BuzzDrop.`;
  }

  return truncateAtWord(desc, 280);
}

export function normalizeStoreCategory(raw: string): string {
  if (!raw?.trim()) return "Trending";

  let label = raw.trim().replace(/，/g, ",");

  if (label.includes(">")) {
    label = label.split(">")[0]!.trim();
  } else if (label.includes("/")) {
    label = label.split("/")[0]!.trim();
  } else if (label.includes(",")) {
    label = label.split(",")[0]!.trim();
  }

  const key = label.toLowerCase();
  if (CANONICAL_CATEGORIES[key]) return CANONICAL_CATEGORIES[key]!;

  for (const [pattern, canonical] of Object.entries(CANONICAL_CATEGORIES)) {
    if (key.startsWith(pattern) || key.includes(pattern)) return canonical;
  }

  if (label.length > 24) {
    return truncateAtWord(label, 22) + "…";
  }

  return label;
}

export function buildProductSlug(title: string, supplierPid?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");

  if (supplierPid) {
    const suffix = supplierPid.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
    if (suffix) return `${base}-${suffix}`;
  }

  return base || "product";
}

export function normalizeCjProduct<T extends { title: string; description: string; category: string; supplier_pid?: string }>(
  product: T
): T {
  const title = normalizeProductTitle(product.title);
  return {
    ...product,
    title,
    description: normalizeProductDescription(product.description, product.title),
    category: normalizeStoreCategory(product.category),
  };
}
