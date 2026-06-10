/**
 * Professional BuzzDrop Facebook assets — matches site header branding.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/social");

const BRAND = {
  amber: "#f59e0b",
  amberLight: "#fbbf24",
  orange: "#f97316",
  bg: "#09090b",
  zinc400: "#a1a1aa",
  zinc500: "#71717a",
  white: "#ffffff",
};

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

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

function drawBolt(ctx, cx, cy, size, fill) {
  const s = size / 32;
  ctx.save();
  ctx.translate(cx - 16 * s, cy - 16 * s);
  ctx.scale(s, s);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(18, 4);
  ctx.lineTo(8, 18);
  ctx.lineTo(14, 18);
  ctx.lineTo(12, 28);
  ctx.lineTo(24, 12);
  ctx.lineTo(18, 12);
  ctx.lineTo(20, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBrandGradient(ctx, x, y, w, h, radius) {
  roundRect(ctx, x, y, w, h, radius);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, BRAND.amber);
  g.addColorStop(1, BRAND.orange);
  ctx.fillStyle = g;
  ctx.fill();
}

function drawWordmark(ctx, x, y, size) {
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  const buzzW = ctx.measureText("Buzz").width;
  ctx.fillStyle = BRAND.white;
  ctx.fillText("Buzz", x, y);
  ctx.fillStyle = BRAND.amberLight;
  ctx.fillText("Drop", x + buzzW, y);
}

/** Profile: full-bleed gradient — fills Facebook's circular crop cleanly */
function generateProfile(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "#fbbf24");
  g.addColorStop(0.45, BRAND.amber);
  g.addColorStop(1, "#ea580c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Soft vignette — adds depth, still reads as solid brand color in circle crop
  const vignette = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.2,
    size / 2,
    size / 2,
    size * 0.72
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);

  drawBolt(ctx, size / 2, size / 2 + size * 0.01, size * 0.36, BRAND.white);

  return canvas.toBuffer("image/png");
}

/** Cover: content in safe zone (x ≥ 240, y ≤ 250) — profile pic overlaps bottom-left */
function generateCover(w, h) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, "#070708");
  bg.addColorStop(0.35, BRAND.bg);
  bg.addColorStop(1, "#0c0a09");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.78, h * 0.5, 0, w * 0.78, h * 0.5, w * 0.5);
  glow.addColorStop(0, "rgba(234, 88, 12, 0.14)");
  glow.addColorStop(1, "rgba(9, 9, 11, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Content anchor — above profile overlap (profile top ≈ y 140 on 312px cover)
  const blockLeft = 260;
  const iconSize = 52;
  const iconTop = 58;

  drawBrandGradient(ctx, blockLeft, iconTop, iconSize, iconSize, 11);
  drawBolt(ctx, blockLeft + iconSize / 2, iconTop + iconSize / 2, iconSize * 0.5, BRAND.white);

  const textX = blockLeft + iconSize + 16;
  drawWordmark(ctx, textX, iconTop + 36, 40);

  ctx.font = `500 16px ${FONT}`;
  ctx.fillStyle = BRAND.zinc400;
  ctx.fillText("Viral products · Free UK delivery", textX, iconTop + 62);

  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = BRAND.amberLight;
  ctx.fillText("www.buzzdrop.co.uk", textX, iconTop + 84);

  // Right accent — minimal, no duplicate messaging
  ctx.strokeStyle = "rgba(251, 191, 36, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w - 48, 48);
  ctx.lineTo(w - 48, h - 48);
  ctx.stroke();

  ctx.font = `600 11px ${FONT}`;
  ctx.fillStyle = BRAND.zinc500;
  ctx.save();
  ctx.translate(w - 28, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("TRENDING DAILY", 0, 0);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  writeFileSync(join(OUT, "facebook-profile.png"), generateProfile(512));
  writeFileSync(join(OUT, "facebook-profile@2x.png"), generateProfile(1024));
  writeFileSync(join(OUT, "facebook-cover.png"), generateCover(820, 312));
  writeFileSync(
    join(OUT, "facebook-cover@2x.png"),
    await sharp(generateCover(820, 312)).resize(1640, 624).png().toBuffer()
  );

  console.log("Done → public/social/facebook-profile@2x.png & facebook-cover@2x.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
