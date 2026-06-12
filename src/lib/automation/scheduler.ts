import cron from "node-cron";
import { syncTrendingProducts, tidyProductCatalog, updatePricesAndStock } from "./trend-scraper";
import { runSocialPosting } from "./social-poster";
import { fulfillPendingOrders, markShippedOrders } from "./fulfillment";
import { syncProductsToTikTokShop } from "../tiktok-shop/sync";
import { logAutomation } from "./logger";
import { getSetting, setSetting } from "../db";
import { trendDiscoveryConfig } from "../config/trend-discovery";
import { pruneLowPerformingProductsWithLog } from "./catalog-prune";

let started = false;

async function runProductSync() {
  try {
    await syncTrendingProducts();
  } catch (err) {
    console.error("[BuzzDrop] Product sync failed:", err);
  }
}

async function runCatalogPrune() {
  try {
    await pruneLowPerformingProductsWithLog();
  } catch (err) {
    await logAutomation("catalog_prune", "error", String(err));
  }
}

async function runPriceUpdate() {
  try {
    await updatePricesAndStock();
  } catch (err) {
    await logAutomation("price_stock_update", "error", String(err));
  }
}

async function runFulfillment() {
  try {
    await fulfillPendingOrders();
    await markShippedOrders();
  } catch (err) {
    await logAutomation("order_fulfillment", "error", String(err));
  }
}

async function runSocialPostJob() {
  try {
    await runSocialPosting();
  } catch (err) {
    await logAutomation("social_post", "error", String(err));
  }
}

async function runTikTokShopSync() {
  try {
    await syncProductsToTikTokShop(5);
  } catch (err) {
    await logAutomation("tiktok_shop_sync", "error", String(err));
  }
}

export function startAutomationScheduler() {
  if (started) return;

  if (process.env.VERCEL === "1" || process.env.DISABLE_INTERNAL_CRON === "true") {
    console.log("[BuzzDrop] Internal cron disabled — use /api/cron/[job] endpoints");
    return;
  }

  started = true;

  const enabled = getSetting("automation_enabled", "true") === "true";
  if (!enabled) {
    console.log("[BuzzDrop] Automation scheduler disabled");
    return;
  }

  const syncCron = trendDiscoveryConfig.syncCron;
  cron.schedule(syncCron, runProductSync);
  cron.schedule("0 */2 * * *", runPriceUpdate);
  cron.schedule("*/5 * * * *", runFulfillment);
  const tz = "Europe/London";
  cron.schedule("0 10 * * *", runSocialPostJob, { timezone: tz });
  cron.schedule("0 18 * * *", runSocialPostJob, { timezone: tz });
  cron.schedule("0 4 * * *", runTikTokShopSync);
  cron.schedule("0 5 * * *", runCatalogPrune);

  setSetting("scheduler_started_at", new Date().toISOString());
  console.log("[BuzzDrop] Automation scheduler started");
  console.log(`  - Product sync: ${syncCron}`);
  console.log(`  - Catalog prune: 05:00 daily (0 views/orders after 30 days, cap ${trendDiscoveryConfig.catalogMaxActive} active)`);
  console.log("  - Price/stock update: every 2 hours");
  console.log("  - Order fulfillment: every 5 minutes");
  console.log(`  - Social marketing: 10:00 & 18:00 daily (${tz})`);
  console.log("  - TikTok Shop sync: 04:00 daily");

  setTimeout(() => void runProductSync(), 10_000);
}

export async function runJobManually(
  job: "sync" | "pricing" | "fulfillment" | "tidy" | "social" | "tiktok_shop" | "prune"
): Promise<{ success: boolean; message: string }> {
  try {
    switch (job) {
      case "sync": {
        const result = await syncTrendingProducts();
        return {
          success: true,
          message: `Synced products: ${result.added} added, ${result.updated} updated (${result.keywordsUsed} trend keywords)`,
        };
      }
      case "tidy": {
        const result = tidyProductCatalog();
        return {
          success: true,
          message: `Tidied catalog: ${result.deactivated} demo hidden, ${result.updated} cleaned, ${result.pruned} low performers hidden, ${result.trimmed} trimmed to cap`,
        };
      }
      case "prune": {
        const result = await pruneLowPerformingProductsWithLog();
        return {
          success: true,
          message: `Pruned catalog: ${result.pruned} inactive products hidden, ${result.trimmed} trimmed to cap`,
        };
      }
      case "social": {
        const result = await runSocialPosting();
        if (result.skipped) {
          return { success: false, message: result.skipped };
        }
        return {
          success: result.failed === 0,
          message: `Social: ${result.posted} posted${result.failed ? `, ${result.failed} failed` : ""}`,
        };
      }
      case "pricing": {
        const count = await updatePricesAndStock();
        return { success: true, message: `Updated ${count} products` };
      }
      case "fulfillment": {
        const fulfilled = await fulfillPendingOrders();
        const shipped = await markShippedOrders();
        return { success: true, message: `Fulfilled ${fulfilled}, shipped ${shipped}` };
      }
      case "tiktok_shop": {
        const result = await syncProductsToTikTokShop(5);
        return {
          success: result.errors.length === 0 || result.created > 0,
          message: `TikTok Shop: ${result.created} created, ${result.skipped} skipped${
            result.errors.length ? `, ${result.errors.length} errors` : ""
          }`,
        };
      }
    }
  } catch (err) {
    return { success: false, message: String(err) };
  }
}
