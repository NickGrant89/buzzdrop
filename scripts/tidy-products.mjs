#!/usr/bin/env node
/** One-off catalog tidy — deactivates demo products and normalizes CJ copy. */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../data/trenddrop.db");

const BRAND_PREFIXES = /^(CJEER|Phomemo|Tuya|Baseus|Ugreen|Anker|Xiaomi)\s+/i;
const LEADING_FILLER = /^(New|Hot|Best|Top|Latest|Creative|Multifunctional|Portable|Mini|Small)\s+/i;
const TRAILING_FILLER =
  /\s+(For Home Use|Home Use|Wireless|Bluetooth-compatible|Bluetooth Compatible|\d+)\s*$/i;
const TYPO_FIXES = [
  [/\bSpeake\b/gi, "Speaker"],
  [/\bAcessories\b/gi, "Accessories"],
  [/\bLed\b/g, "LED"],
  [/\bUsb\b/g, "USB"],
];

const CANONICAL = {
  gadgets: "Gadgets",
  trending: "Trending",
  home: "Home",
  "home & garden": "Home",
  kitchen: "Kitchen",
  beauty: "Beauty & Health",
  "health, beauty & hair": "Beauty & Health",
  fashion: "Fashion",
  "phones & accessories": "Phone Accessories",
  "consumer electronics": "Electronics",
  "computer & office": "Tech & Office",
  "sports & outdoors": "Sports & Outdoors",
  pet: "Pet",
  auto: "Auto",
  "jewelry & watches": "Jewellery",
  jewelery: "Jewellery",
};

function decodeHtml(text) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function titleCase(text) {
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

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const last = cut.lastIndexOf(" ");
  return (last > max * 0.6 ? cut.slice(0, last) : cut).trim();
}

function normalizeTitle(raw) {
  let title = decodeHtml(raw.replace(/<[^>]+>/g, " ")).replace(BRAND_PREFIXES, "");
  title = title.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) {
    const next = title.replace(LEADING_FILLER, "");
    if (next === title) break;
    title = next.trim();
  }
  for (const [pattern, replacement] of TYPO_FIXES) {
    title = title.replace(pattern, replacement);
  }
  if (title.length > 80 && title.includes(",")) title = title.split(",")[0].trim();
  title = titleCase(title);
  for (let i = 0; i < 2; i++) {
    const next = title.replace(TRAILING_FILLER, "");
    if (next === title) break;
    title = next.trim();
  }
  return truncate(title, 65);
}

function normalizeDesc(raw, title) {
  let desc = decodeHtml(raw.replace(/<[^>]+>/g, " ")).replace(/^Overview:\s*/i, "");
  desc = desc.replace(/^\d+\.\s*/gm, "").replace(/\s+/g, " ").trim();
  const sentences = desc.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [];
  if (sentences.length) desc = sentences.slice(0, 2).join(" ");
  if (desc.length < 20) desc = `${normalizeTitle(title)}. Free UK delivery — trending pick on BuzzDrop.`;
  return truncate(desc, 280);
}

function normalizeCategory(raw) {
  if (!raw?.trim()) return "Trending";
  let label = raw.trim().replace(/，/g, ",");
  if (label.includes(">")) label = label.split(">")[0].trim();
  else if (label.includes("/")) label = label.split("/")[0].trim();
  else if (label.includes(",")) label = label.split(",")[0].trim();
  const key = label.toLowerCase();
  if (CANONICAL[key]) return CANONICAL[key];
  for (const [pattern, canonical] of Object.entries(CANONICAL)) {
    if (key.startsWith(pattern) || key.includes(pattern)) return canonical;
  }
  return label.length > 24 ? truncate(label, 22) + "…" : label;
}

function buildSlug(title, pid) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  if (pid) {
    const suffix = pid.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
    if (suffix) return `${base}-${suffix}`;
  }
  return base || "product";
}

const db = new Database(dbPath);
const now = new Date().toISOString();

const deactivated = db
  .prepare(`UPDATE products SET is_active = 0, updated_at = ? WHERE supplier_pid = '' OR supplier_pid IS NULL`)
  .run(now).changes;

const rows = db
  .prepare(`SELECT id, title, description, category, supplier_pid FROM products WHERE is_active = 1 AND supplier_pid != ''`)
  .all();

const update = db.prepare(
  `UPDATE products SET slug = ?, title = ?, description = ?, category = ?, updated_at = ? WHERE id = ?`
);

let updated = 0;
const tx = db.transaction(() => {
  for (const row of rows) {
    const title = normalizeTitle(row.title);
    update.run(
      buildSlug(title, row.supplier_pid),
      title,
      normalizeDesc(row.description, row.title),
      normalizeCategory(row.category),
      now,
      row.id
    );
    updated++;
  }
});
tx();

const active = db.prepare("SELECT COUNT(*) as n FROM products WHERE is_active = 1").get().n;
console.log(JSON.stringify({ deactivated, updated, active }, null, 2));
console.log("\nSample products:");
console.log(db.prepare("SELECT title, category FROM products WHERE is_active = 1 LIMIT 8").all());
