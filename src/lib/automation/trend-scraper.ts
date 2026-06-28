import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { calculateRetailPriceWithShipping, landedSupplierCost } from "./pricing";
import { logAutomation } from "./logger";
import { isCjConfigured, defaultCjShippingEstimate } from "../config";
import { trendDiscoveryConfig } from "../config/trend-discovery";
import { fetchCjTrendingProductsWithMeta } from "../suppliers/cj/products";
import { estimateCjShipping } from "../suppliers/cj/shipping";
import { getTrendKeywords, applyTrendKeywordBoost } from "./trend-keywords";
import { pruneLowPerformingProducts, trimExcessCatalogProducts, trimExcessCatalogProductsWithLog } from "./catalog-prune";
import { HiddenReason } from "../hidden-products";
import {
  buildProductSlug,
  normalizeProductDescription,
  normalizeProductTitle,
  normalizeStoreCategory,
} from "../product-normalize";

export type TrendingProductSource = {
  title: string;
  description: string;
  image_url: string;
  category: string;
  supplier_cost: number;
  supplier_product_cost: number;
  supplier_shipping_cost: number;
  trend_score: number;
  supplier_sku: string;
  supplier_pid?: string;
  supplier_vid?: string;
  supplier_name?: string;
  stock?: number;
};

function upsertProducts(
  allProducts: TrendingProductSource[],
  trendKeywords: string[]
): { added: number; updated: number } {
  const findByPid = db.prepare(
    "SELECT id, slug FROM products WHERE supplier_pid = ? AND supplier_pid != ''"
  );
  const insert = db.prepare(`
    INSERT INTO products (
      id, slug, title, description, image_url, category,
      supplier_cost, supplier_product_cost, supplier_shipping_cost,
      retail_price, trend_score, supplier_sku, supplier_pid, supplier_vid, supplier_name,
      stock, is_active, created_at, updated_at
    ) VALUES (
      @id, @slug, @title, @description, @image_url, @category,
      @supplier_cost, @supplier_product_cost, @supplier_shipping_cost,
      @retail_price, @trend_score, @supplier_sku, @supplier_pid, @supplier_vid, @supplier_name,
      @stock, 1, @now, @now
    )
  `);
  const update = db.prepare(`
    UPDATE products SET
      slug = @slug,
      title = @title,
      description = @description,
      image_url = @image_url,
      category = @category,
      supplier_cost = @supplier_cost,
      supplier_product_cost = @supplier_product_cost,
      supplier_shipping_cost = @supplier_shipping_cost,
      retail_price = @retail_price,
      trend_score = @trend_score,
      supplier_sku = @supplier_sku,
      supplier_vid = @supplier_vid,
      supplier_name = @supplier_name,
      stock = @stock,
      is_active = 1,
      updated_at = @now
    WHERE id = @id
  `);

  let added = 0;
  let updated = 0;
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    for (const raw of allProducts) {
      const title = normalizeProductTitle(raw.title);
      const description = normalizeProductDescription(raw.description, raw.title);
      const category = normalizeStoreCategory(raw.category);
      const supplierPid = raw.supplier_pid ?? "";
      const slug = buildProductSlug(title, supplierPid || undefined);
      const trendScore = applyTrendKeywordBoost(
        title,
        description,
        raw.trend_score,
        trendKeywords
      );
      const retailPrice = calculateRetailPriceWithShipping(
        raw.supplier_product_cost,
        raw.supplier_shipping_cost,
        trendScore
      );

      const payload = {
        slug,
        title,
        description,
        image_url: raw.image_url,
        category,
        supplier_cost: raw.supplier_cost,
        supplier_product_cost: raw.supplier_product_cost,
        supplier_shipping_cost: raw.supplier_shipping_cost,
        retail_price: retailPrice,
        trend_score: trendScore,
        supplier_sku: raw.supplier_sku,
        supplier_pid: supplierPid,
        supplier_vid: raw.supplier_vid ?? "",
        supplier_name: raw.supplier_name ?? "CJ Dropshipping",
        stock: raw.stock ?? 50,
        now,
      };

      const existing = supplierPid
        ? (findByPid.get(supplierPid) as { id: string; slug: string } | undefined)
        : undefined;

      if (existing) {
        update.run({ ...payload, id: existing.id });
        updated++;
      } else {
        insert.run({ ...payload, id: uuidv4() });
        added++;
      }
    }
  });

  transaction();
  return { added, updated };
}

/** Deactivate demo/legacy products, re-normalize copy, and prune low performers. */
export function tidyProductCatalog(): {
  deactivated: number;
  updated: number;
  pruned: number;
  trimmed: number;
} {
  const now = new Date().toISOString();

  const deactivated = db
    .prepare(
      `UPDATE products SET is_active = 0, hidden_reason = ?, updated_at = ? WHERE supplier_pid = '' OR supplier_pid IS NULL`
    )
    .run(HiddenReason.Demo, now).changes;

  const rows = db
    .prepare(
      "SELECT id, title, description, category, supplier_pid FROM products WHERE is_active = 1 AND supplier_pid != ''"
    )
    .all() as Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    supplier_pid: string;
  }>;

  const update = db.prepare(`
    UPDATE products SET
      slug = ?, title = ?, description = ?, category = ?, updated_at = ?
    WHERE id = ?
  `);

  let updated = 0;
  const transaction = db.transaction(() => {
    for (const row of rows) {
      const title = normalizeProductTitle(row.title);
      const description = normalizeProductDescription(row.description, row.title);
      const category = normalizeStoreCategory(row.category);
      const slug = buildProductSlug(title, row.supplier_pid);

      update.run(slug, title, description, category, now, row.id);
      updated++;
    }
  });
  transaction();

  const { pruned } = pruneLowPerformingProducts();
  const { trimmed } = trimExcessCatalogProducts();

  return { deactivated, updated, pruned, trimmed };
}

export async function syncTrendingProducts(): Promise<{
  added: number;
  updated: number;
  source: string;
  keywordsUsed: number;
}> {
  if (!isCjConfigured()) {
    throw new Error(
      "CJ Dropshipping not configured. Add CJ_API_KEY (or CJ_EMAIL + CJ_PASSWORD) to .env.local."
    );
  }

  try {
    const keywordSnapshot = await getTrendKeywords();
    const syncLimit = trendDiscoveryConfig.syncLimit;
    const { products: cjProducts, candidatesFound } = await fetchCjTrendingProductsWithMeta(
      syncLimit,
      keywordSnapshot.keywords
    );

    if (cjProducts.length === 0 && candidatesFound === 0) {
      await logAutomation(
        "product_sync",
        "error",
        "CJ catalog search returned 0 products — API may need product permissions enabled in CJ dashboard"
      );
      return { added: 0, updated: 0, source: "cj", keywordsUsed: keywordSnapshot.keywords.length };
    }

    if (cjProducts.length === 0) {
      await logAutomation(
        "product_sync",
        "error",
        `CJ found ${candidatesFound} products but could not load variants — retry in a minute`
      );
      return { added: 0, updated: 0, source: "cj", keywordsUsed: keywordSnapshot.keywords.length };
    }

    const result = upsertProducts(
      cjProducts.map((p) => ({
        ...p,
        supplier_name: "CJ Dropshipping (UK warehouse)",
      })),
      keywordSnapshot.keywords
    );

    const { trimmed } = await trimExcessCatalogProductsWithLog();
    const trimNote = trimmed > 0 ? ` · ${trimmed} trimmed to cap` : "";

    const googleCount = keywordSnapshot.sources.google.length;
    const tiktokCount = keywordSnapshot.sources.tiktok.length;
    await logAutomation(
      "product_sync",
      "success",
      `CJ UK: synced ${cjProducts.length} products (${result.added} new, ${result.updated} updated)${trimNote} · ${keywordSnapshot.keywords.length} keywords (Google ${googleCount}, TikTok ${tiktokCount})`
    );
    return { ...result, source: "cj", keywordsUsed: keywordSnapshot.keywords.length };
  } catch (err) {
    await logAutomation("product_sync", "error", `CJ sync failed: ${String(err)}`);
    throw err;
  }
}

export async function updatePricesAndStock(): Promise<number> {
  if (!isCjConfigured()) return 0;

  const products = db
    .prepare(
      `SELECT id, supplier_vid, supplier_product_cost, supplier_shipping_cost, supplier_cost, trend_score
       FROM products WHERE is_active = 1 AND supplier_pid != '' AND is_pinned = 0`
    )
    .all() as {
    id: string;
    supplier_vid: string;
    supplier_product_cost: number;
    supplier_shipping_cost: number;
    supplier_cost: number;
    trend_score: number;
  }[];

  if (products.length === 0) return 0;

  const update = db.prepare(`
    UPDATE products
    SET retail_price = ?, supplier_product_cost = ?, supplier_shipping_cost = ?, supplier_cost = ?, updated_at = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();
  let count = 0;

  for (const p of products) {
    let productCost = p.supplier_product_cost;
    if (productCost <= 0) {
      productCost =
        p.supplier_shipping_cost > 0
          ? Math.max(0, p.supplier_cost - p.supplier_shipping_cost)
          : p.supplier_cost;
    }

    let shippingCost = p.supplier_shipping_cost;
    if (p.supplier_vid) {
      try {
        const estimate = await estimateCjShipping([{ vid: p.supplier_vid, quantity: 1 }]);
        if (estimate) shippingCost = estimate.shippingCost;
      } catch {
        shippingCost = shippingCost > 0 ? shippingCost : defaultCjShippingEstimate();
      }
      await new Promise((r) => setTimeout(r, 300));
    } else if (shippingCost <= 0) {
      shippingCost = defaultCjShippingEstimate();
    }

    const landedCost = landedSupplierCost(productCost, shippingCost);
    const newPrice = calculateRetailPriceWithShipping(productCost, shippingCost, p.trend_score);
    update.run(newPrice, productCost, shippingCost, landedCost, now, p.id);
    count++;
  }

  await logAutomation(
    "price_stock_update",
    "success",
    `Updated ${count} product prices (CJ shipping included)`
  );
  return count;
}
