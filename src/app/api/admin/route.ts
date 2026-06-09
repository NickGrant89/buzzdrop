import { NextResponse } from "next/server";
import { db, getSetting, setSetting } from "@/lib/db";
import { getStoreStats } from "@/lib/products";
import { getRecentLogs } from "@/lib/automation/logger";
import { runJobManually } from "@/lib/automation/scheduler";
import { isCjConfigured } from "@/lib/config";
import { testCjConnection } from "@/lib/suppliers/cj/client";
import { isStripeConfigured } from "@/lib/stripe";
import { getSocialConfig, isSocialPostingEnabled } from "@/lib/marketing/social-config";
import { getRecentSocialPosts, previewNextSocialPost, testSocialWebhook } from "@/lib/automation/social-poster";
import { deletePendingOrdersWithLog } from "@/lib/orders-maintenance";
import { testTikTokShopConnection, isTikTokShopConfigured } from "@/lib/tiktok-shop/client";

export async function GET() {
  const stats = getStoreStats();
  const logs = getRecentLogs(15);
  const automationEnabled = getSetting("automation_enabled", "true") === "true";
  const socialPostingEnabled = getSetting("social_posting_enabled", "true") === "true";
  const schedulerStarted = getSetting("scheduler_started_at", "");
  const socialLastRun = getSetting("social_last_run_at", "");

  const recentOrders = db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 10")
    .all();

  const cjConfigured = isCjConfigured();
  let cjStatus = {
    configured: cjConfigured,
    connected: false,
    email: undefined as string | undefined,
    isSandbox: undefined as boolean | undefined,
    message: cjConfigured ? "Not tested yet" : "Add CJ_API_KEY or CJ_EMAIL + CJ_PASSWORD to .env.local",
  };

  if (cjConfigured) {
    const test = await testCjConnection();
    cjStatus = {
      configured: true,
      connected: test.connected,
      email: test.email,
      isSandbox: test.isSandbox,
      message: test.message,
    };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const stripe = {
    configured: isStripeConfigured(),
    mode: stripeKey.startsWith("sk_live_")
      ? "live"
      : stripeKey.startsWith("sk_test_")
        ? "test"
        : "off",
  };

  const socialConfig = getSocialConfig();
  const preview = previewNextSocialPost();

  let tiktokShop = {
    configured: isTikTokShopConfigured(),
    connected: false,
    message: "Not configured",
    syncedCount: 0,
  };

  if (isTikTokShopConfigured()) {
    const test = await testTikTokShopConnection();
    const syncedCount = (
      db.prepare("SELECT COUNT(*) as c FROM products WHERE tiktok_product_id != ''").get() as {
        c: number;
      }
    ).c;
    tiktokShop = {
      configured: true,
      connected: test.connected,
      message: test.message,
      syncedCount,
    };
  }

  return NextResponse.json({
    stats,
    logs,
    automationEnabled,
    socialPostingEnabled,
    schedulerStarted,
    socialLastRun,
    recentOrders,
    cj: cjStatus,
    stripe,
    social: {
      enabled: isSocialPostingEnabled() && socialPostingEnabled,
      platforms: socialConfig.platforms,
      configured: socialConfig.configured,
      schedule: "10:00 & 18:00 daily",
      preview: preview
        ? {
            title: preview.product.title,
            caption: preview.payload.caption,
            productUrl: preview.payload.productUrl,
          }
        : null,
      recentPosts: getRecentSocialPosts(8),
    },
    tiktokShop,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "toggle_automation") {
    const enabled = body.enabled === true;
    setSetting("automation_enabled", enabled ? "true" : "false");
    return NextResponse.json({ automationEnabled: enabled });
  }

  if (body.action === "toggle_social") {
    const enabled = body.enabled === true;
    setSetting("social_posting_enabled", enabled ? "true" : "false");
    return NextResponse.json({ socialPostingEnabled: enabled });
  }

  if (body.action === "run_job") {
    const job = body.job as "sync" | "pricing" | "fulfillment" | "tidy" | "social" | "tiktok_shop";
    const result = await runJobManually(job);
    return NextResponse.json(result);
  }

  if (body.action === "test_cj") {
    const result = await testCjConnection();
    return NextResponse.json(result);
  }

  if (body.action === "delete_pending_orders") {
    const result = await deletePendingOrdersWithLog();
    return NextResponse.json(result);
  }

  if (body.action === "test_social_webhook") {
    const result = await testSocialWebhook();
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
