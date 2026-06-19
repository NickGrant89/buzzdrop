/**
 * Upload local ad MP4s (+ slide JPGs) to live BuzzDrop (admin auth).
 *
 * Usage:
 *   npm run push:videos
 *   node scripts/push-ad-videos.mjs --live
 *   node scripts/push-ad-videos.mjs --url=https://www.buzzdrop.co.uk
 *
 * Requires ADMIN_PASSWORD in .env.local (or env).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VIDEOS = join(ROOT, "public/social/videos");
const LIVE_DEFAULT = "https://www.buzzdrop.co.uk";
const FETCH_TIMEOUT_MS = 120_000;

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* optional */
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let url = null;
  let live = false;

  for (const arg of args) {
    if (arg === "--live") live = true;
    else if (arg.startsWith("--url=")) url = arg.slice("--url=".length).trim();
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  npm run push:videos
  node scripts/push-ad-videos.mjs --live
  node scripts/push-ad-videos.mjs --url=https://www.buzzdrop.co.uk`);
      process.exit(0);
    }
  }

  return { url, live };
}

function resolveTargetBase(urlArg, live) {
  if (urlArg) return urlArg.replace(/\/$/, "");
  if (live || process.env.npm_lifecycle_event === "push:videos") return LIVE_DEFAULT;

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!envUrl) return LIVE_DEFAULT;
  if (/localhost|127\.0\.0\.1/.test(envUrl)) return null;
  return envUrl;
}

async function fetchWithTimeout(url, options = {}, label = "request") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      throw new Error(
        `${label} timed out after ${FETCH_TIMEOUT_MS / 1000}s — is the server running at ${url}?`
      );
    }
    throw new Error(`${label} failed for ${url}: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

async function uploadAsset(base, cookie, slug, filename, buffer, mime) {
  const form = new FormData();
  form.append("slug", slug);
  form.append("file", new Blob([buffer], { type: mime }), filename);

  const res = await fetchWithTimeout(
    `${base}/api/admin/marketing/videos`,
    {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    },
    `Upload ${filename}`
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`✗ ${filename}:`, body.error ?? res.status);
    return false;
  }
  console.log(`✓ ${filename} → ${body.url}`);
  return true;
}

loadEnvLocal();

const { url: urlArg, live } = parseArgs();
const targetBase = resolveTargetBase(urlArg, live);

if (!targetBase) {
  console.error(
    "NEXT_PUBLIC_APP_URL points to localhost — start dev server, or run:\n" +
      "  npm run push:videos\n" +
      "  node scripts/push-ad-videos.mjs --live"
  );
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD;

if (!password || password.length < 8) {
  console.error("Set ADMIN_PASSWORD in .env.local (min 8 chars)");
  process.exit(1);
}

if (!existsSync(VIDEOS)) {
  console.error("Missing folder public/social/videos — run: npm run generate:videos");
  process.exit(1);
}

const files = readdirSync(VIDEOS).filter((f) => f.endsWith("-ad.mp4"));
if (files.length === 0) {
  console.error("No videos in public/social/videos — run: npm run generate:videos");
  process.exit(1);
}

console.log(`Target: ${targetBase}`);
console.log("Logging in to admin…");

const loginRes = await fetchWithTimeout(
  `${targetBase}/api/auth/admin`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  },
  "Admin login"
);

if (!loginRes.ok) {
  console.error("Admin login failed:", loginRes.status, await loginRes.text());
  process.exit(1);
}

const cookie = loginRes.headers.getSetCookie?.()?.[0]?.split(";")[0];
if (!cookie) {
  console.error("No session cookie from login");
  process.exit(1);
}

console.log(`Uploading ${files.length} video(s)…\n`);

for (const filename of files) {
  const slug = filename.replace(/-ad\.mp4$/, "");
  const buffer = readFileSync(join(VIDEOS, filename));
  await uploadAsset(targetBase, cookie, slug, filename, buffer, "video/mp4");

  const slideName = `${slug}-slide.jpg`;
  const slidePath = join(VIDEOS, slideName);
  if (existsSync(slidePath)) {
    const slideBuffer = readFileSync(slidePath);
    await uploadAsset(targetBase, cookie, `${slug}-slide`, slideName, slideBuffer, "image/jpeg");
  }
}

console.log("\nDone. Verify:");
console.log(`  curl -I ${targetBase}/social/videos/${files[0]}`);
