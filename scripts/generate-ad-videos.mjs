/**
 * Generate 9:16 vertical ad videos for hero products (TikTok / Reels / Meta).
 * 3-scene structure: hook → product hero → price/CTA with crossfade transitions.
 *
 * Requires ffmpeg: brew install ffmpeg
 * Usage: npm run generate:videos
 * Output: public/social/videos/*-ad.mp4
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/social/videos");
const W = 1080;
const H = 1920;
const FPS = 30;

const BRAND = {
  bg: "#09090b",
  amber: "#fbbf24",
  orange: "#f97316",
  white: "#ffffff",
  muted: "#a1a1aa",
  card: "#18181b",
  stroke: "#3f3f46",
};

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Scene lengths (seconds) — total ~13s after crossfades */
const SCENES = [
  { id: "hook", duration: 2.8, zoom: "in" },
  { id: "product", duration: 6.2, zoom: "pan" },
  { id: "cta", duration: 4.5, zoom: "pulse" },
];
const XFADE = 0.45;

function hasFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function productHook(title, priceNum) {
  const t = title.toLowerCase();
  if (/note|message board|led.*board/.test(t)) return "It glows like a neon sign";
  if (/g shaped|bluetooth|speaker|wireless charg|lamp/.test(t)) return "3-in-1 bedside essential";
  if (/cooler|air condition|cooling|humidifier/.test(t)) return "Beat the heat at your desk";
  if (/printer|label/.test(t)) return "Study hack under £50";
  if (/cat|dog|pet|brush|steam/.test(t)) return "Pet owners are obsessed";
  if (/jacket|heated|winter/.test(t)) return "Winter essential under £45";
  if (/hair removal|crystal/.test(t)) return "Beauty hack going viral";
  if (/washer|sink|spray/.test(t)) return "Kitchen upgrade for less";
  if (priceNum <= 30) return "TikTok made me buy it";
  if (priceNum <= 45) return "Viral find under £45";
  return "Trending on BuzzDrop";
}

const HERO_PRICE_MIN = 15;
const HERO_PRICE_MAX = 45;
const HERO_MIN_MARGIN_GBP = 4;

function marginGbp(product) {
  return Math.round((Number(product.retail_price) - Number(product.supplier_cost)) * 100) / 100;
}

function scoreHeroProduct(product) {
  const margin = marginGbp(product);
  let score = 0;
  if (margin >= HERO_MIN_MARGIN_GBP) score += Math.min(Math.max(margin, 0) * 4, 35);
  score += Math.min(Number(product.trend_score) || 0, 99) * 0.4;
  const price = Number(product.retail_price);
  if (price >= HERO_PRICE_MIN && price <= HERO_PRICE_MAX) score += 20;
  else if (price >= 10 && price <= 55) score += 8;
  const views = Number(product.view_count) || 0;
  if (views > 0) score += Math.min(Math.log10(views + 1) * 5, 10);
  if ((product.image_url || "").includes("placeholder")) score -= 25;
  if (Number(product.stock) <= 0) score -= 50;
  return score;
}

/** Mirror admin hero picker — diverse categories, best for ads. */
function pickHeroProducts(products, limit = 3) {
  const eligible = products
    .filter(
      (p) =>
        p.is_active === 1 &&
        p.supplier_pid &&
        Number(p.stock) > 0 &&
        scoreHeroProduct(p) > 0 &&
        marginGbp(p) >= 2
    )
    .sort((a, b) => scoreHeroProduct(b) - scoreHeroProduct(a));

  const picked = [];
  const usedCategories = new Set();

  for (const product of eligible) {
    if (picked.length >= limit) break;
    const cat = (product.category || "").toLowerCase();
    if (picked.length < limit - 1 && usedCategories.has(cat) && eligible.length > limit * 2) {
      continue;
    }
    picked.push(product);
    usedCategories.add(cat);
  }

  if (picked.length < limit) {
    for (const product of eligible) {
      if (picked.length >= limit) break;
      if (picked.some((p) => p.slug === product.slug)) continue;
      picked.push(product);
    }
  }

  return picked.slice(0, limit);
}

function heroFromProduct(p) {
  const priceNum = Number(p.retail_price);
  const title = p.title.length > 36 ? `${p.title.slice(0, 33)}…` : p.title;
  return {
    slug: p.slug,
    title,
    subtitle: p.category ? `${p.category} · UK stock` : "Trending · UK stock",
    price: `£${priceNum.toFixed(2)}`,
    priceNum,
    hook: productHook(p.title, priceNum),
    cta: "Free UK delivery",
    image_url: p.image_url,
  };
}

async function loadHeroes(site) {
  try {
    const heroRes = await fetch(`${site}/api/products/heroes`);
    if (heroRes.ok) {
      const data = await heroRes.json();
      if (data.heroes?.length > 0) {
        console.log("Using hero products from /api/products/heroes");
        return data.heroes.map(heroFromProduct);
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const res = await fetch(`${site}/api/products`);
    if (!res.ok) throw new Error("Could not fetch products");
    const data = await res.json();
    const products = data.products ?? [];
    const heroes = pickHeroProducts(products, 3);
    if (heroes.length > 0) {
      console.log("Using hero products from live catalog scoring");
      return heroes.map(heroFromProduct);
    }
  } catch (err) {
    console.warn("Could not load heroes:", err instanceof Error ? err.message : err);
  }

  throw new Error("No hero products found — sync products first");
}

async function blurredBg(imageBuffer, darken = 0.55) {
  const blurred = await sharp(imageBuffer)
    .resize(W, H, { fit: "cover", position: "centre" })
    .blur(28)
    .modulate({ brightness: 0.7 })
    .toBuffer();
  if (darken <= 0) return blurred;
  return sharp(blurred)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="rgb(9,9,11)" opacity="${darken}"/></svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBrand(ctx, y = 100) {
  ctx.font = `700 52px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const x = 72;
  ctx.fillStyle = BRAND.white;
  const buzzW = ctx.measureText("Buzz").width;
  ctx.fillText("Buzz", x, y);
  ctx.fillStyle = BRAND.amber;
  ctx.fillText("Drop", x + buzzW, y);
}

function drawTrendPill(ctx, text, x, y) {
  ctx.font = `600 28px ${FONT}`;
  const padX = 28;
  const w = ctx.measureText(text).width + padX * 2;
  roundRect(ctx, x, y, w, 52, 26);
  ctx.fillStyle = "rgba(251, 191, 36, 0.15)";
  ctx.fill();
  ctx.strokeStyle = BRAND.amber;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = BRAND.amber;
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + 36);
  ctx.textAlign = "left";
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderSceneHook(hero, productImg, bgBuffer, outPath) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const bg = await loadImage(bgBuffer);
  ctx.drawImage(bg, 0, 0, W, H);

  drawBrand(ctx, 110);
  drawTrendPill(ctx, "TRENDING NOW", 72, 160);

  ctx.textAlign = "center";
  ctx.font = `800 92px ${FONT}`;
  ctx.fillStyle = BRAND.white;
  const lines = wrapText(ctx, hero.hook, W - 120);
  const startY = H * 0.38 - ((lines.length - 1) * 52) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, startY + i * 100);
  });

  const thumb = await sharp(productImg).resize(420, 420, { fit: "cover" }).png().toBuffer();
  const thumbImg = await loadImage(thumb);
  const tx = (W - 420) / 2;
  const ty = H - 620;
  ctx.save();
  roundRect(ctx, tx, ty, 420, 420, 32);
  ctx.clip();
  ctx.drawImage(thumbImg, tx, ty, 420, 420);
  ctx.restore();
  roundRect(ctx, tx, ty, 420, 420, 32);
  ctx.strokeStyle = BRAND.amber;
  ctx.lineWidth = 4;
  ctx.stroke();

  writeFileSync(outPath, canvas.toBuffer("image/jpeg", { quality: 92 }));
}

async function renderSceneProduct(hero, productImg, bgBuffer, outPath) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const bg = await loadImage(bgBuffer);
  ctx.drawImage(bg, 0, 0, W, H);

  drawBrand(ctx, 100);

  const cardW = 920;
  const cardH = 920;
  const cx = (W - cardW) / 2;
  const cy = 340;
  roundRect(ctx, cx, cy, cardW, cardH, 40);
  ctx.fillStyle = BRAND.card;
  ctx.fill();
  ctx.strokeStyle = BRAND.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  const inner = await sharp(productImg).resize(840, 840, { fit: "contain", background: BRAND.card }).png().toBuffer();
  const innerImg = await loadImage(inner);
  ctx.drawImage(innerImg, cx + 40, cy + 40, 840, 840);

  ctx.textAlign = "center";
  ctx.font = `700 48px ${FONT}`;
  ctx.fillStyle = BRAND.white;
  ctx.fillText(hero.title, W / 2, cy + cardH + 72);

  ctx.font = `400 32px ${FONT}`;
  ctx.fillStyle = BRAND.muted;
  ctx.fillText(hero.subtitle, W / 2, cy + cardH + 124);

  ctx.font = `800 64px ${FONT}`;
  ctx.fillStyle = BRAND.amber;
  ctx.fillText(hero.price, W / 2, cy + cardH + 200);

  writeFileSync(outPath, canvas.toBuffer("image/jpeg", { quality: 92 }));
}

async function renderSceneCta(hero, productImg, bgBuffer, outPath) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const bg = await loadImage(bgBuffer);
  ctx.drawImage(bg, 0, 0, W, H);

  const thumb = await sharp(productImg).resize(360, 360, { fit: "cover" }).png().toBuffer();
  const thumbImg = await loadImage(thumb);
  const tx = (W - 360) / 2;
  ctx.drawImage(thumbImg, tx, 280, 360, 360);

  ctx.textAlign = "center";
  ctx.font = `800 108px ${FONT}`;
  ctx.fillStyle = BRAND.amber;
  ctx.fillText(hero.price, W / 2, 780);

  ctx.font = `600 40px ${FONT}`;
  ctx.fillStyle = BRAND.white;
  ctx.fillText(hero.cta, W / 2, 860);

  const btnW = 520;
  const btnH = 96;
  const bx = (W - btnW) / 2;
  const by = 940;
  roundRect(ctx, bx, by, btnW, btnH, 48);
  const g = ctx.createLinearGradient(bx, by, bx + btnW, by + btnH);
  g.addColorStop(0, BRAND.amber);
  g.addColorStop(1, BRAND.orange);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.font = `700 40px ${FONT}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("SHOP NOW", W / 2, by + 62);

  ctx.font = `500 34px ${FONT}`;
  ctx.fillStyle = BRAND.muted;
  ctx.fillText("buzzdrop.co.uk", W / 2, 1100);

  drawBrand(ctx, H - 120);

  writeFileSync(outPath, canvas.toBuffer("image/jpeg", { quality: 92 }));
}

function imageToClip(imagePath, outPath, durationSec, zoomMode) {
  const frames = Math.ceil(durationSec * FPS);
  let zoomFilter;
  switch (zoomMode) {
    case "in":
      zoomFilter = `zoompan=z='min(1.0+on*0.0012,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}`;
      break;
    case "pan":
      zoomFilter = `zoompan=z='min(1.02+on*0.0006,1.14)':x='(iw-iw/zoom)*on/${frames}*0.35':y='(ih-ih/zoom)/2':d=${frames}:s=${W}x${H}:fps=${FPS}`;
      break;
    case "pulse":
    default:
      zoomFilter = `zoompan=z='1.06+0.04*sin(2*PI*on/${frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}`;
      break;
  }

  execSync(
    `ffmpeg -y -loop 1 -i "${imagePath}" -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,${zoomFilter}" -c:v libx264 -pix_fmt yuv420p -t ${durationSec} -r ${FPS} -an "${outPath}"`,
    { stdio: "ignore" }
  );
}

function mergeClips(clipPaths, outPath) {
  if (clipPaths.length === 1) {
    execSync(`ffmpeg -y -i "${clipPaths[0]}" -c copy "${outPath}"`, { stdio: "ignore" });
    return;
  }

  let offset = SCENES[0].duration - XFADE;
  let filter = `[0:v][1:v]xfade=transition=fadeblack:duration=${XFADE}:offset=${offset.toFixed(2)}[v01]`;
  let last = "[v01]";

  for (let i = 2; i < clipPaths.length; i++) {
    offset += SCENES[i - 1].duration - XFADE;
    const out = i === clipPaths.length - 1 ? "[outv]" : `[v0${i}]`;
    filter += `;${last}[${i}:v]xfade=transition=fadeblack:duration=${XFADE}:offset=${offset.toFixed(2)}${out}`;
    last = out;
  }

  const inputs = clipPaths.map((p) => `-i "${p}"`).join(" ");
  try {
    execSync(
      `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -r ${FPS} -an "${outPath}"`,
      { stdio: "pipe" }
    );
  } catch (err) {
    const stderr = err?.stderr?.toString?.() ?? "";
    throw new Error(`ffmpeg merge failed: ${stderr.slice(-400)}`);
  }
}

async function generateHeroVideo(hero, productBuffer) {
  const tmpDir = join(OUT, `.tmp-${hero.slug}`);
  mkdirSync(tmpDir, { recursive: true });

  const bgBuffer = await blurredBg(productBuffer, 0.5);
  const scenePaths = [];
  const clipPaths = [];

  const scenes = [
    { render: renderSceneHook, scene: SCENES[0] },
    { render: renderSceneProduct, scene: SCENES[1] },
    { render: renderSceneCta, scene: SCENES[2] },
  ];

  for (let i = 0; i < scenes.length; i++) {
    const scenePath = join(tmpDir, `scene-${i + 1}.jpg`);
    const clipPath = join(tmpDir, `clip-${i + 1}.mp4`);
    await scenes[i].render(hero, productBuffer, bgBuffer, scenePath);
    imageToClip(scenePath, clipPath, scenes[i].scene.duration, scenes[i].scene.zoom);
    scenePaths.push(scenePath);
    clipPaths.push(clipPath);
  }

  const mp4Path = join(OUT, `${hero.slug}-ad.mp4`);
  mergeClips(clipPaths, mp4Path);

  rmSync(tmpDir, { recursive: true, force: true });
  return mp4Path;
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

  console.log("Generating 3-scene ad videos (hook → product → CTA)…\n");

  for (const hero of heroes) {
    console.log(`→ ${hero.title}`);
    const productBuffer = await fetchImage(hero.image_url);
    const mp4Path = await generateHeroVideo(hero, productBuffer);
    console.log(`  ✓ ${mp4Path}`);
  }

  console.log("\nDone. Upload MP4s to TikTok / Reels / Meta video ads.");
  console.log("Tip: film a 15-sec real demo later — swap when you have footage.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
