/**
 * Upload local ad MP4s to live BuzzDrop (admin auth).
 * Usage: node scripts/push-ad-videos.mjs
 * Requires ADMIN_PASSWORD in .env.local (or env) and NEXT_PUBLIC_APP_URL.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VIDEOS = join(ROOT, "public/social/videos");

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

loadEnvLocal();

const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.buzzdrop.co.uk").replace(/\/$/, "");
const password = process.env.ADMIN_PASSWORD;

if (!password || password.length < 8) {
  console.error("Set ADMIN_PASSWORD in .env.local (min 8 chars)");
  process.exit(1);
}

const files = readdirSync(VIDEOS).filter((f) => f.endsWith("-ad.mp4"));
if (files.length === 0) {
  console.error("No videos in public/social/videos — run: npm run generate:videos");
  process.exit(1);
}

const loginRes = await fetch(`${base}/api/auth/admin`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password }),
});

if (!loginRes.ok) {
  console.error("Admin login failed:", loginRes.status, await loginRes.text());
  process.exit(1);
}

const cookie = loginRes.headers.getSetCookie?.()?.[0]?.split(";")[0];
if (!cookie) {
  console.error("No session cookie from login");
  process.exit(1);
}

console.log(`Uploading ${files.length} video(s) to ${base}…\n`);

for (const filename of files) {
  const slug = filename.replace(/-ad\.mp4$/, "");
  const buffer = readFileSync(join(VIDEOS, filename));
  const form = new FormData();
  form.append("slug", slug);
  form.append("file", new Blob([buffer], { type: "video/mp4" }), filename);

  const res = await fetch(`${base}/api/admin/marketing/videos`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`✗ ${filename}:`, body.error ?? res.status);
  } else {
    console.log(`✓ ${filename} → ${body.url}`);
  }
}

console.log("\nDone. Verify: curl -I", `${base}/social/videos/${files[0]}`);
