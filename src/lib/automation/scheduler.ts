import cron from "node-cron";
import { syncTrendingProducts, tidyProductCatalog, updatePricesAndStock } from "./trend-scraper";
import { runSocialPosting } from "./social-poster";
import { fulfillPendingOrders, markShippedOrders } from "./fulfillment";
import { syncProductsToTikTokShop } from "../tiktok-shop/sync";
import { logAutomation } from "./logger";
import { getSetting, setSetting } from "../db";

let started = false;

async function runProductSync() {
  try {
    await syncTrendingProducts();
  } catch (err) {
    // syncTrendingProducts already logs errors
    console.error("[BuzzDrop] Product sync failed:", err);
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

  // Vercel/serverless: use /api/cron/* + CRON_SECRET instead of in-process cron
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

  cron.schedule("0 */6 * * *", runProductSync);
  cron.schedule("0 */2 * * *", runPriceUpdate);
  cron.schedule("*/5 * * * *", runFulfillment);
  cron.schedule("0 10 * * *", runSocialPostJob);
  cron.schedule("0 18 * * *", runSocialPostJob);
  cron.schedule("0 4 * * *", runTikTokShopSync);

  setSetting("scheduler_started_at", new Date().toISOString());
  console.log("[BuzzDrop] Automation scheduler started");
  console.log("  - Product sync: every 6 hours");
  console.log("  - Price/stock update: every 2 hours");
  console.log("  - Order fulfillment: every 5 minutes");
  console.log("  - Social marketing: 10:00 & 18:00 daily");
  console.log("  - TikTok Shop sync: 04:00 daily");

  // Defer first sync so the HTTP server can respond immediately on deploy
  setTimeout(() => void runProductSync(), 10_000);
}

export async function runJobManually(
  job: "sync" | "pricing" | "fulfillment" | "tidy" | "social" | "tiktok_shop"
): Promise<{ success: boolean; message: string }> {
  try {
    switch (job) {
      case "sync": {
        const result = await syncTrendingProducts();
        return { success: true, message: `Synced products: ${result.added} added, ${result.updated} updated` };
      }
      case "tidy": {
        const result = tidyProductCatalog();
        return {
          success: true,
          message: `Tidied catalog: ${result.deactivated} demo products hidden, ${result.updated} CJ products cleaned`,
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
