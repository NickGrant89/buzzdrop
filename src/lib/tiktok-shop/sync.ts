import { db, type Product } from "../db";
import { logAutomation } from "../automation/logger";
import { getTikTokShopConfig, tiktokShopRequest } from "./client";

type SyncResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function buildTikTokTitle(title: string): string {
  return title.slice(0, 255);
}

function buildTikTokDescription(product: Product): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.buzzdrop.co.uk";
  return [
    product.description.slice(0, 1500),
    "",
    `Shop: ${siteUrl}/product/${product.slug}`,
    "",
    "Free UK delivery.",
  ].join("\n");
}

async function createTikTokProduct(product: Product, categoryId: string): Promise<string> {
  const pricePence = Math.round(product.retail_price * 100);

  const data = await tiktokShopRequest<{ product_id?: string }>(
    "POST",
    "/product/202309/products",
    {
      title: buildTikTokTitle(product.title),
      description: buildTikTokDescription(product),
      category_id: categoryId,
      main_images: [{ uri: product.image_url }],
      skus: [
        {
          seller_sku: product.supplier_sku || product.id,
          price: {
            amount: String(pricePence),
            currency: "GBP",
          },
          inventory: [{ quantity: Math.max(product.stock, 1) }],
        },
      ],
    }
  );

  if (!data.product_id) {
    throw new Error("TikTok Shop did not return a product_id");
  }

  return data.product_id;
}

export async function syncProductsToTikTokShop(limit = 5): Promise<SyncResult> {
  const config = getTikTokShopConfig();
  if (!config) {
    throw new Error("TikTok Shop not configured");
  }

  if (!config.defaultCategoryId) {
    throw new Error(
      "Set TIKTOK_SHOP_DEFAULT_CATEGORY_ID in Railway — pick a category from TikTok Seller Center"
    );
  }

  const products = db
    .prepare(
      `SELECT * FROM products
       WHERE is_active = 1 AND supplier_pid != ''
       ORDER BY trend_score DESC
       LIMIT ?`
    )
    .all(limit) as Product[];

  const updateTikTokId = db.prepare(
    "UPDATE products SET tiktok_product_id = ?, updated_at = ? WHERE id = ?"
  );

  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const now = new Date().toISOString();

  for (const product of products) {
    try {
      if (product.tiktok_product_id) {
        result.skipped++;
        continue;
      }

      const tiktokId = await createTikTokProduct(product, config.defaultCategoryId);
      updateTikTokId.run(tiktokId, now, product.id);
      result.created++;
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`${product.title.slice(0, 40)}: ${message}`);
    }
  }

  await logAutomation(
    "tiktok_shop_sync",
    result.errors.length && result.created === 0 ? "error" : "success",
    `TikTok Shop: ${result.created} created, ${result.skipped} already synced${
      result.errors.length ? `, ${result.errors.length} errors` : ""
    }`
  );

  return result;
}
