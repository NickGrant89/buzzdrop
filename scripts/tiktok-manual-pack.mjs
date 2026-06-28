/**
 * List local ad MP4s with TikTok captions for manual posting.
 * Usage: npm run tiktok:pack
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VIDEOS = join(ROOT, "public/social/videos");
const site = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.buzzdrop.co.uk").replace(/\/$/, "");

function roundToCharmPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n + 0.01) - 0.01;
}

function themeFor(slug, title) {
  const text = `${slug} ${title}`.toLowerCase();
  if (/note|message.?board|led.*board/.test(text)) return "noteboard";
  if (/cool|fan|air.?condition/.test(text)) return "cooler";
  if (/lamp|speaker|bluetooth|g-shaped/.test(text)) return "lamp";
  if (/hair|beauty|crystal|curler/.test(text)) return "beauty";
  if (/washer|sink|spray|kitchen|cup/.test(text) && !/dog|pet|car/.test(text)) return "kitchen";
  if (/dog|pet|cat|puppy/.test(text)) return "pet";
  if (/car|phone.?holder|dash|vehicle/.test(text)) return "car";
  if (/jacket|heated|winter/.test(text)) return "winter";
  if (/clothing|tank|top|fashion/.test(text)) return "fashion";
  return "generic";
}

function hashtags(theme) {
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
              : theme === "pet"
                ? "#dogsoftiktok #petfinds #dogowner #ukpets"
                : theme === "car"
                  ? "#cartok #cardashboard #driving #ukcars"
                  : theme === "winter"
                    ? "#winterfashion #heatedjacket #ukwinter #outdoor"
                    : theme === "fashion"
                      ? "#ootd #ukfashion #stylefinds #affordablefashion"
                      : "#gadgets #trending #ukfinds";
  return `#buzzdrop #uktiktok #fyp #viral #freedelivery ${extra}`.trim();
}

function caption(product, theme) {
  const priceLabel = `£${roundToCharmPrice(product.retail_price).toFixed(2)}`;
  switch (theme) {
    case "noteboard":
      return `The viral LED note board everyone's putting on their bedside table 👀\n\nWrite any message — it glows like a mini neon sign ✨\n\nFree UK delivery · ${priceLabel}`;
    case "cooler":
      return `UK summer desk hack — this tiny cooler actually works 🧊\n\nQuiet, portable, perfect for home office.\n\nFree UK delivery · ${priceLabel}`;
    case "lamp":
      return `Room upgrade for less than a takeaway 🎵\n\nG-shaped LED lamp + Bluetooth speaker in one.\n\nFree UK delivery · ${priceLabel}`;
    case "beauty":
      return `The beauty hack TikTok won't stop talking about ✨\n\nSmooth skin at home — no salon price tag.\n\nFree UK delivery · ${priceLabel}`;
    case "kitchen":
      return `Why didn't I buy this for my kitchen sooner?\n\nHigh-pressure cup washer — cleans glasses in seconds.\n\nFree UK delivery · ${priceLabel}`;
    case "pet":
      return `Dog owners — this 3-in-1 cup is genius 🐕\n\nWater, food & waste bags in one portable bottle.\n\nFree UK delivery · ${priceLabel}`;
    case "car":
      return `Best car phone mount I've tried 📱\n\nTelescopic arm + strong suction — stays put on UK roads.\n\nFree UK delivery · ${priceLabel}`;
    case "winter":
      return `Heated jacket season is here — USB powered warmth 🔥\n\nPerfect for dog walks, commuting & outdoor work.\n\nFree UK delivery · ${priceLabel}`;
    case "fashion":
      return `3-piece set for less than one high-street top 👗\n\nLong sleeve crop tank combo — easy everyday fit.\n\nFree UK delivery · ${priceLabel}`;
    default:
      return `🔥 ${product.title.slice(0, 60)}\n\nTrending at BuzzDrop — free UK delivery 🇬🇧\n\nOnly ${priceLabel}`;
  }
}

const res = await fetch(`${site}/api/products`);
if (!res.ok) {
  console.error("Could not fetch products");
  process.exit(1);
}
const { products } = await res.json();
const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));

const files = readdirSync(VIDEOS)
  .filter((f) => f.endsWith("-ad.mp4"))
  .sort();

if (files.length === 0) {
  console.error("No videos — run: npm run generate:videos");
  process.exit(1);
}

const lines = [
  "# BuzzDrop TikTok manual posting pack",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Bio link: https://www.buzzdrop.co.uk",
  "",
];

for (const file of files) {
  const slug = file.replace(/-ad\.mp4$/, "");
  const product = bySlug[slug];
  const path = join(VIDEOS, file);
  const theme = product ? themeFor(slug, product.title) : "generic";
  const cap = product
    ? caption(product, theme)
    : `Shop at BuzzDrop — free UK delivery`;
  const tags = hashtags(theme);
  const url = product ? `${site}/product/${slug}?utm_source=tiktok&utm_medium=organic&utm_campaign=manual` : site;

  lines.push("---");
  lines.push(`## ${product?.title ?? slug}`);
  lines.push(`Video: ${path}`);
  lines.push(`Product: ${url}`);
  lines.push("");
  lines.push("Caption (paste in TikTok):");
  lines.push(cap);
  lines.push("");
  lines.push("Hashtags:");
  lines.push(tags);
  lines.push("");
  lines.push(`Pin comment: Link in bio → ${url}`);
  lines.push("");
}

const outPath = join(VIDEOS, "TIKTOK-MANUAL-PACK.md");
writeFileSync(outPath, lines.join("\n"));
console.log(`Wrote ${files.length} post(s) → ${outPath}\n`);
for (const file of files) {
  console.log(`  ${join(VIDEOS, file)}`);
}
