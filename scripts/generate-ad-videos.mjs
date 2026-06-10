/**
 * Generate 9:16 vertical ad videos for hero products (TikTok / Reels / Meta).
 * Requires ffmpeg: brew install ffmpeg
 *
 * Usage: npm run generate:videos
 * Output: public/social/videos/*-ad.mp4
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/social/videos");
const W = 1080;
const H = 1920;
const DURATION = 12;

function hasFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const FALLBACK_HEROES = [
  {
    slug: "note-board-creative-led-night-light-usb-message-953728",
    title: "LED Note Board — Message Light",
    price: "£22.78",
    hook: "TikTok made me buy it",
    cta: "Free UK delivery · buzzdrop.co.uk",
    image_url: "https://cf.cjdropshipping.com/1e288b3c-b238-47f1-8087-ca3ae2d92709.jpg",
  },
  {
    slug: "intelligent-g-shaped-led-lamp-bluetooth-speaker-567488",
    title: "G-Lamp · Speaker · Wireless Charge",
    price: "£51.98",
    hook: "Trending on BuzzDrop",
    cta: "Free UK delivery · buzzdrop.co.uk",
    image_url: "https://cf.cjdropshipping.com/5651039d-38e6-4851-aaef-38be1445e4a4.jpg",
  },
  {
    slug: "air-conditioner-air-cooler-fan-water-cooling-fan-662976",
    title: "Portable Air Cooler Fan",
    price: "£27.98",
    hook: "TikTok made me buy it",
    cta: "Free UK delivery · buzzdrop.co.uk",
    image_url: "https://cf.cjdropshipping.com/quick/product/b08e3a55-0f55-442b-8355-85b43df714d4.jpg",
  },
];

function heroFromProduct(p) {
  return {
    slug: p.slug,
    title: p.title.slice(0, 40),
    price: `£${Number(p.retail_price).toFixed(2)}`,
    hook:
      p.retail_price <= 30
        ? "TikTok made me buy it"
        : p.retail_price <= 45
          ? "Viral find under £45"
          : "Trending on BuzzDrop",
    cta: "Free UK delivery · buzzdrop.co.uk",
    image_url: p.image_url,
  };
}

async function loadHeroes(site) {
  try {
    const res = await fetch(`${site}/api/products`);
    if (!res.ok) throw new Error("Could not fetch products");
    const data = await res.json();
    const products = data.products ?? [];

    const pick = (match) => products.find((p) => match.test(p.title.toLowerCase()));

    const note = pick(/note|message board|led.*board/);
    const lamp = pick(/g shaped|bluetooth speaker|wireless charg/);
    const cooler = pick(/cooler|air condition|cooling fan/);
    const chosen = [note, lamp, cooler, products[0]].filter(Boolean);

    const unique = [...new Map(chosen.map((p) => [p.slug, p])).values()].slice(0, 3);
    if (unique.length > 0) return unique.map(heroFromProduct);
  } catch (err) {
    console.warn("Using fallback heroes:", err instanceof Error ? err.message : err);
  }
  return FALLBACK_HEROES;
}

async function makeSlide(hero, imageBuffer, outPath) {
  const productImg = await sharp(imageBuffer)
    .resize(W, Math.round(H * 0.55), { fit: "cover", position: "centre" })
    .toBuffer();

  const productH = Math.round(H * 0.55);
  const padTop = 280;

  const titleSvg = `<svg width="${W}" height="120"><text x="540" y="70" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="700" fill="#fbbf24">${escapeXml(hero.hook)}</text></svg>`;
  const nameSvg = `<svg width="${W}" height="100"><text x="540" y="60" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" font-weight="600" fill="#ffffff">${escapeXml(hero.title)}</text></svg>`;
  const priceSvg = `<svg width="${W}" height="80"><text x="540" y="55" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#ffffff">${escapeXml(hero.price)}</text></svg>`;
  const ctaSvg = `<svg width="${W}" height="80"><text x="540" y="50" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" fill="#a1a1aa">${escapeXml(hero.cta)}</text></svg>`;
  const brandSvg = `<svg width="${W}" height="100"><text x="480" y="65" text-anchor="start" font-family="Arial,sans-serif" font-size="56" font-weight="700" fill="#ffffff">Buzz</text><text x="580" y="65" text-anchor="start" font-family="Arial,sans-serif" font-size="56" font-weight="700" fill="#fbbf24">Drop</text></svg>`;

  await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 9, g: 9, b: 11 } },
  })
    .composite([
      { input: Buffer.from(brandSvg), top: 80, left: 0 },
      { input: productImg, top: padTop, left: 0 },
      { input: Buffer.from(titleSvg), top: padTop + productH + 24, left: 0 },
      { input: Buffer.from(nameSvg), top: padTop + productH + 140, left: 0 },
      { input: Buffer.from(priceSvg), top: padTop + productH + 230, left: 0 },
      { input: Buffer.from(ctaSvg), top: H - 120, left: 0 },
    ])
    .jpeg({ quality: 92 })
    .toFile(outPath);
}

function imageToVideo(slidePath, outMp4, seconds = DURATION) {
  // Slow zoom (Ken Burns) — reads better than a static slide on Reels/TikTok
  const zoom =
    `zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${seconds * 30}:s=${W}x${H}:fps=30`;
  execSync(
    `ffmpeg -y -loop 1 -i "${slidePath}" -c:v libx264 -t ${seconds} -pix_fmt yuv420p -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,${zoom}" -r 30 "${outMp4}"`,
    { stdio: "ignore" }
  );
}

async function main() {
  if (!hasFfmpeg()) {
    console.error("Install ffmpeg first: brew install ffmpeg");
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });
  const site = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.buzzdrop.co.uk";

  const heroes = await loadHeroes(site);
  if (heroes.length === 0) {
    console.error("No products found");
    process.exit(1);
  }

  for (const hero of heroes) {
    console.log(`Generating ${hero.slug}…`);
    const imageBuffer = await fetchImage(hero.image_url);
    const slidePath = join(OUT, `${hero.slug}-slide.jpg`);
    const mp4Path = join(OUT, `${hero.slug}-ad.mp4`);
    await makeSlide(hero, imageBuffer, slidePath);
    imageToVideo(slidePath, mp4Path);
    console.log(`  → ${mp4Path}`);
  }

  console.log("\nDone. Upload MP4s to TikTok / Instagram Reels / Meta ads.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
