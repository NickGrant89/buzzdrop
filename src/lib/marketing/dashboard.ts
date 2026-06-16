import { db } from "../db";
import { isEmailConfigured } from "../email";
import { isMetaCapiConfigured } from "../meta-capi";
import { getHiddenProductCount } from "../hidden-products";

export type MarketingDashboard = {
  funnel: {
    productViews: number;
    checkoutsStarted: number;
    ordersPaid: number;
    viewToCheckoutRate: number;
    checkoutToPaidRate: number;
    viewToPaidRate: number;
  };
  revenue: {
    totalGbp: number;
    paidOrders: number;
    averageOrderValue: number;
    pendingCheckouts: number;
  };
  abandonedCart: {
    pendingOver1h: number;
    remindersSent: number;
    emailConfigured: boolean;
  };
  integrations: {
    metaPixel: boolean;
    metaCapi: boolean;
    resendEmail: boolean;
  };
  topProducts: Array<{
    id: string;
    title: string;
    slug: string;
    views: number;
    orders: number;
    conversionRate: number;
    retailPrice: number;
  }>;
  heroAlerts: Array<{
    title: string;
    views: number;
    orders: number;
    slug: string;
  }>;
  recentPaidOrders: Array<{
    id: string;
    email: string;
    total: number;
    createdAt: string;
  }>;
};

export function getMarketingDashboard(): MarketingDashboard {
  const productViewsRow = db
    .prepare(`SELECT COALESCE(SUM(view_count), 0) AS views FROM products WHERE is_active = 1`)
    .get() as { views: number };

  const checkoutsStarted = (
    db.prepare(`SELECT COUNT(*) AS c FROM orders WHERE COALESCE(order_kind, 'standard') = 'standard'`).get() as {
      c: number;
    }
  ).c;

  const paidOrdersRow = db
    .prepare(
      `SELECT COUNT(*) AS c, COALESCE(SUM(total), 0) AS revenue
       FROM orders
       WHERE status IN ('paid', 'fulfilled', 'shipped')
         AND COALESCE(order_kind, 'standard') = 'standard'`
    )
    .get() as { c: number; revenue: number };

  const pendingCheckouts = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM orders
         WHERE status = 'pending' AND COALESCE(order_kind, 'standard') = 'standard'`
      )
      .get() as { c: number }
  ).c;

  const pendingOver1h = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM orders
         WHERE status = 'pending'
           AND COALESCE(order_kind, 'standard') = 'standard'
           AND datetime(created_at) <= datetime('now', '-1 hour')`
      )
      .get() as { c: number }
  ).c;

  const remindersSent = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM orders
         WHERE abandoned_reminder_1_at IS NOT NULL OR abandoned_reminder_2_at IS NOT NULL`
      )
      .get() as { c: number }
  ).c;

  const productViews = productViewsRow.views;
  const ordersPaid = paidOrdersRow.c;
  const checkoutsStartedCount = checkoutsStarted;

  const topProducts = db
    .prepare(
      `SELECT
         p.id,
         p.title,
         p.slug,
         p.view_count AS views,
         p.retail_price AS retailPrice,
         COALESCE((
           SELECT COUNT(*) FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           WHERE oi.product_id = p.id AND o.status IN ('paid', 'fulfilled', 'shipped')
         ), 0) AS orders
       FROM products p
       WHERE p.is_active = 1 AND p.hidden_reason IS NULL
       ORDER BY p.view_count DESC
       LIMIT 8`
    )
    .all() as Array<{
    id: string;
    title: string;
    slug: string;
    views: number;
    orders: number;
    retailPrice: number;
  }>;

  const heroAlerts = topProducts
    .filter((p) => p.views >= 50 && p.orders === 0)
    .slice(0, 3)
    .map((p) => ({
      title: p.title,
      views: p.views,
      orders: p.orders,
      slug: p.slug,
    }));

  const recentPaidOrders = db
    .prepare(
      `SELECT id, customer_email AS email, total, created_at AS createdAt
       FROM orders
       WHERE status IN ('paid', 'fulfilled', 'shipped')
       ORDER BY created_at DESC
       LIMIT 5`
    )
    .all() as Array<{ id: string; email: string; total: number; createdAt: string }>;

  return {
    funnel: {
      productViews,
      checkoutsStarted: checkoutsStartedCount,
      ordersPaid,
      viewToCheckoutRate:
        productViews > 0 ? Math.round((checkoutsStartedCount / productViews) * 1000) / 10 : 0,
      checkoutToPaidRate:
        checkoutsStartedCount > 0
          ? Math.round((ordersPaid / checkoutsStartedCount) * 1000) / 10
          : 0,
      viewToPaidRate:
        productViews > 0 ? Math.round((ordersPaid / productViews) * 1000) / 10 : 0,
    },
    revenue: {
      totalGbp: Math.round(paidOrdersRow.revenue * 100) / 100,
      paidOrders: ordersPaid,
      averageOrderValue:
        ordersPaid > 0 ? Math.round((paidOrdersRow.revenue / ordersPaid) * 100) / 100 : 0,
      pendingCheckouts,
    },
    abandonedCart: {
      pendingOver1h,
      remindersSent,
      emailConfigured: isEmailConfigured(),
    },
    integrations: {
      metaPixel: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()),
      metaCapi: isMetaCapiConfigured(),
      resendEmail: isEmailConfigured(),
    },
    topProducts: topProducts.map((p) => ({
      ...p,
      conversionRate: p.views > 0 ? Math.round((p.orders / p.views) * 1000) / 10 : 0,
    })),
    heroAlerts,
    recentPaidOrders,
  };
}

export function getMarketingSummaryLine(dashboard: MarketingDashboard): string {
  const hidden = getHiddenProductCount();
  return `${dashboard.funnel.productViews} views · ${dashboard.funnel.checkoutsStarted} checkouts · ${dashboard.revenue.paidOrders} sales · ${hidden} hidden products`;
}
