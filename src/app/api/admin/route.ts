import { NextResponse } from "next/server";
import { db, getSetting, setSetting } from "@/lib/db";
import { getStoreStats } from "@/lib/products";
import { getHiddenProducts, getHiddenProductCount, restoreProduct } from "@/lib/hidden-products";
import { getHeroProducts, syncHeroProductPins } from "@/lib/hero-products";
import { buildAdUrl } from "@/lib/meta-pixel";
import { getRecentLogs } from "@/lib/automation/logger";
import { runJobManually } from "@/lib/automation/scheduler";
import { isCjConfigured } from "@/lib/config";
import { testCjConnection } from "@/lib/suppliers/cj/client";
import { isStripeConfigured } from "@/lib/stripe";
import { getSocialConfig, isSocialPostingEnabled } from "@/lib/marketing/social-config";
import { getRecentSocialPosts, previewNextSocialPost, testSocialWebhook } from "@/lib/automation/social-poster";
import { deletePendingOrdersWithLog } from "@/lib/orders-maintenance";
import { testTikTokShopConnection, isTikTokShopConfigured } from "@/lib/tiktok-shop/client";
import { trendDiscoveryConfig } from "@/lib/config/trend-discovery";
import { automationScheduleLabels } from "@/lib/automation/schedule-labels";
import { buildTikTokManualPosts } from "@/lib/marketing/tiktok-content";
import { getMarketingDashboard } from "@/lib/marketing/dashboard";
import { createManualPayment, listPendingManualPayments } from "@/lib/manual-payments";
import { quoteManualOrderShipping } from "@/lib/manual-shipping";
import { getActiveProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/seo";

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

  let trendKeywords: {
    count: number;
    google: number;
    tiktok: number;
    refreshedAt: string | null;
    sample: string[];
  } = { count: 0, google: 0, tiktok: 0, refreshedAt: null, sample: [] };

  try {
    const raw = getSetting("trend_keywords_cache", "");
    if (raw) {
      const parsed = JSON.parse(raw) as {
        keywords?: string[];
        sources?: { google?: string[]; tiktok?: string[] };
        refreshedAt?: string;
      };
      trendKeywords = {
        count: parsed.keywords?.length ?? 0,
        google: parsed.sources?.google?.length ?? 0,
        tiktok: parsed.sources?.tiktok?.length ?? 0,
        refreshedAt: parsed.refreshedAt ?? null,
        sample: (parsed.keywords ?? []).slice(0, 8),
      };
    }
  } catch {
    /* ignore bad cache */
  }

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

  syncHeroProductPins();
  const heroProducts = getHeroProducts(3);
  const hiddenProducts = getHiddenProducts(50);

  return NextResponse.json({
    stats: { ...stats, hiddenProductCount: getHiddenProductCount() },
    marketing: getMarketingDashboard(),
    logs,
    automationEnabled,
    socialPostingEnabled,
    schedulerStarted,
    socialLastRun,
    recentOrders,
    cj: cjStatus,
    stripe,
    heroProducts: heroProducts.map((h, i) => {
      const base =
        `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.buzzdrop.co.uk"}/product/${h.product.slug}`;
      const campaign = `hero-${i + 1}-${h.product.slug.slice(0, 24)}`;
      return {
        id: h.product.id,
        slug: h.product.slug,
        title: h.product.title,
        imageUrl: h.product.image_url,
        retailPrice: h.product.retail_price,
        marginGbp: h.marginGbp,
        marginPercent: h.marginPercent,
        trendScore: h.product.trend_score,
        views: h.product.view_count ?? 0,
        score: h.score,
        pinned: Boolean(h.product.is_pinned),
        reasons: h.reasons,
        productUrl: base,
        adUrlFacebook: buildAdUrl(base, "facebook", campaign),
        adUrlInstagram: buildAdUrl(base, "instagram", campaign),
        adUrlTikTok: buildAdUrl(base, "tiktok", campaign),
      };
    }),
    hiddenProducts,
    tikTokPosts: buildTikTokManualPosts(heroProducts.map((h) => h.product)),
    pendingManualPayments: listPendingManualPayments(10).map((p) => ({
      ...p,
      payUrl: `${getSiteUrl()}/pay/${p.id}`,
    })),
    catalogProducts: getActiveProducts(60).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      retailPrice: p.retail_price,
      supplierSku: p.supplier_sku,
      imageUrl: p.image_url,
    })),
    metaPixel: {
      configured: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()),
    },
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
    automation: {
      productSync: automationScheduleLabels.productSync(trendDiscoveryConfig.syncCron),
      priceStock: automationScheduleLabels.priceStock,
      fulfillment: automationScheduleLabels.fulfillment,
      social: automationScheduleLabels.social,
      catalogPrune: automationScheduleLabels.catalogPrune,
      abandonedCartEmails: automationScheduleLabels.abandonedCartEmails,
      syncLimit: trendDiscoveryConfig.syncLimit,
      pruneAfterDays: trendDiscoveryConfig.pruneAfterDays,
      catalogMaxActive: trendDiscoveryConfig.catalogMaxActive,
      googleTrendsEnabled: trendDiscoveryConfig.googleTrendsEnabled,
      tiktokTrendsEnabled: trendDiscoveryConfig.tiktokTrendsEnabled,
      deployCommit:
        process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ??
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
        "local",
      trendKeywords,
    },
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
    const job = body.job as
      | "sync"
      | "pricing"
      | "fulfillment"
      | "tidy"
      | "social"
      | "tiktok_shop"
      | "prune"
      | "abandoned_emails";
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

  if (body.action === "restore_product") {
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (!productId) {
      return NextResponse.json({ success: false, message: "Missing productId" }, { status: 400 });
    }
    const result = restoreProduct(productId);
    return NextResponse.json({ success: result.ok, message: result.message });
  }

  if (body.action === "quote_manual_shipping") {
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const destCountryCode =
      typeof body.destCountryCode === "string" ? body.destCountryCode.trim() : "GB";
    const destPostcode = typeof body.destPostcode === "string" ? body.destPostcode.trim() : "";
    const quantity = Number(body.quantity ?? 1);

    if (!productId) {
      return NextResponse.json({ success: false, message: "Select a product first" }, { status: 400 });
    }

    try {
      const quote = await quoteManualOrderShipping({
        productId,
        quantity: Number.isFinite(quantity) ? quantity : 1,
        destCountryCode,
        destPostcode,
      });
      return NextResponse.json({ success: true, quote });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not quote shipping";
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
  }

  if (body.action === "create_manual_payment") {
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const amountGbp = Number(body.amountGbp);
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const quantity = Number(body.quantity ?? 1);
    const destCountryCode =
      typeof body.destCountryCode === "string" ? body.destCountryCode.trim() : "";
    const destPostcode = typeof body.destPostcode === "string" ? body.destPostcode.trim() : "";

    if (!customerName || !customerEmail) {
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 }
      );
    }
    if (!description && !productId) {
      return NextResponse.json(
        { success: false, message: "Pick a product or enter a description" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amountGbp) || amountGbp < 0.3) {
      return NextResponse.json(
        { success: false, message: "Amount must be at least £0.30" },
        { status: 400 }
      );
    }

    try {
      const result = createManualPayment({
        customerName,
        customerEmail,
        description,
        amountGbp,
        notes: notes || undefined,
        productId: productId || undefined,
        quantity: Number.isFinite(quantity) ? quantity : 1,
        destCountryCode: destCountryCode || undefined,
        destPostcode: destPostcode || undefined,
      });

      return NextResponse.json({
        success: true,
        message: "Payment link created — send the link to your customer",
        ...result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create payment link";
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
