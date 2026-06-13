"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  RefreshCw,
  Truck,
  DollarSign,
  Package,
  Play,
  Power,
  Loader2,
  CheckCircle,
  XCircle,
  LogOut,
  Sparkles,
  Megaphone,
  Trash2,
  Copy,
  Check,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { formatPrice } from "@/lib/utils";

type AdminData = {
  stats: {
    productCount: number;
    hiddenProductCount: number;
    orderCount: number;
    revenue: number;
    profit: number;
  };
  logs: Array<{ id: string; job_type: string; status: string; message: string; created_at: string }>;
  automationEnabled: boolean;
  schedulerStarted: string;
  cj: {
    configured: boolean;
    connected: boolean;
    email?: string;
    isSandbox?: boolean;
    message: string;
  };
  stripe: {
    configured: boolean;
    mode: "live" | "test" | "off";
  };
  socialPostingEnabled: boolean;
  socialLastRun: string;
  social: {
    enabled: boolean;
    platforms: string[];
    configured: { webhook: boolean; pinterest: boolean; facebook: boolean; instagram: boolean };
    schedule: string;
    preview: { title: string; caption: string; productUrl: string } | null;
    recentPosts: Array<{
      id: string;
      platform: string;
      status: string;
      product_url: string;
      post_url: string | null;
      error_message: string | null;
      posted_at: string | null;
      created_at: string;
    }>;
  };
  recentOrders: Array<{
    id: string;
    customer_email: string;
    status: string;
    total: number;
    tracking_number: string | null;
    created_at: string;
  }>;
  tiktokShop: {
    configured: boolean;
    connected: boolean;
    message: string;
    syncedCount: number;
  };
  automation: {
    productSync: string;
    priceStock: string;
    fulfillment: string;
    social: string;
    catalogPrune: string;
    syncLimit: number;
    pruneAfterDays: number;
    catalogMaxActive: number;
    googleTrendsEnabled: boolean;
    tiktokTrendsEnabled: boolean;
    deployCommit: string;
    trendKeywords: {
      count: number;
      google: number;
      tiktok: number;
      refreshedAt: string | null;
      sample: string[];
    };
  };
  heroProducts: Array<{
    id: string;
    slug: string;
    title: string;
    imageUrl: string;
    retailPrice: number;
    marginGbp: number;
    marginPercent: number;
    trendScore: number;
    views: number;
    score: number;
    pinned: boolean;
    reasons: string[];
    productUrl: string;
    adUrlFacebook: string;
    adUrlInstagram: string;
    adUrlTikTok: string;
    tiktokPost: {
      hook: string;
      caption: string;
      hashtags: string[];
      hashtagsLine: string;
      onScreenText: string[];
      videoScript: string;
      soundSuggestion: string;
      pinnedComment: string;
      seoKeywords: string[];
      checklist: string[];
    };
  }>;
  metaPixel: { configured: boolean };
  hiddenProducts: Array<{
    id: string;
    slug: string;
    title: string;
    retailPrice: number;
    trendScore: number;
    views: number;
    reason: string;
    hiddenAt: string;
  }>;
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copiedAdUrl, setCopiedAdUrl] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function copyAdUrl(key: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAdUrl(key);
      setTimeout(() => setCopiedAdUrl(null), 2000);
    } catch {
      /* ignore */
    }
  }

  async function copyTikTokField(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAdUrl(key);
      setTimeout(() => setCopiedAdUrl(null), 2000);
    } catch {
      /* ignore */
    }
  }

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function runJob(job: "sync" | "pricing" | "fulfillment" | "tidy" | "social" | "tiktok_shop") {
    setRunningJob(job);
    setJobMessage(null);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run_job", job }),
    });
    const result = await res.json().catch(() => ({}));
    if (result.message) {
      setJobMessage({ ok: result.success !== false, text: result.message });
    } else if (result.skipped) {
      setJobMessage({ ok: false, text: result.skipped });
    } else if (result.error) {
      setJobMessage({ ok: false, text: result.error });
    } else if (!res.ok) {
      setJobMessage({ ok: false, text: `Request failed (${res.status})` });
    }
    await fetchData();
    setRunningJob(null);
  }

  async function testMakeWebhook() {
    setTestingWebhook(true);
    setJobMessage(null);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test_social_webhook" }),
    });
    const result = await res.json();
    setJobMessage({
      ok: result.success === true,
      text: result.message ?? (result.success ? "Webhook sent" : "Webhook failed"),
    });
    setTestingWebhook(false);
  }

  async function toggleAutomation() {
    if (!data) return;
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_automation", enabled: !data.automationEnabled }),
    });
    await fetchData();
  }

  async function toggleSocial() {
    if (!data) return;
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_social", enabled: !data.socialPostingEnabled }),
    });
    await fetchData();
  }

  async function deletePendingOrders() {
    const pending = data?.recentOrders.filter((o) => o.status === "pending").length ?? 0;
    if (pending === 0) return;
    if (
      !window.confirm(
        `Delete ${pending} pending unpaid order(s)? This cannot be undone. Paid and fulfilled orders are kept.`
      )
    ) {
      return;
    }
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_pending_orders" }),
    });
    await fetchData();
  }

  async function restoreHiddenProduct(productId: string) {
    setRestoringId(productId);
    setJobMessage(null);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore_product", productId }),
    });
    const result = await res.json().catch(() => ({}));
    setJobMessage({
      ok: result.success === true,
      text: result.message ?? (result.success ? "Product restored" : "Restore failed"),
    });
    await fetchData();
    setRestoringId(null);
  }

  async function handleLogout() {
    await fetch("/api/auth/admin", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  if (loading) {
    return (
      <StoreLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      </StoreLayout>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      label: "Active products",
      value: data.stats.productCount,
      sub:
        data.stats.hiddenProductCount > 0
          ? `${data.stats.hiddenProductCount} hidden`
          : undefined,
      icon: Package,
      color: "text-violet-400",
    },
    { label: "Orders", value: data.stats.orderCount, icon: Truck, color: "text-blue-400" },
    { label: "Revenue", value: formatPrice(data.stats.revenue), icon: DollarSign, color: "text-emerald-400" },
    { label: "Profit", value: formatPrice(data.stats.profit), icon: Zap, color: "text-fuchsia-400" },
  ];

  const jobs = [
    { id: "sync" as const, label: "Sync Trending Products", icon: RefreshCw, desc: "Import viral products" },
    { id: "social" as const, label: "Post to Social", icon: Megaphone, desc: "Share next trending product" },
    { id: "tiktok_shop" as const, label: "Sync TikTok Shop", icon: RefreshCw, desc: "Push products to TikTok Shop" },
    { id: "tidy" as const, label: "Tidy Product Catalog", icon: Sparkles, desc: "Clean titles, categories & hide demos" },
    { id: "pricing" as const, label: "Update Prices & Stock", icon: DollarSign, desc: "Recalculate margins" },
    { id: "fulfillment" as const, label: "Process Fulfillment", icon: Truck, desc: "Submit orders to supplier" },
  ];

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Automation Dashboard</h1>
            <p className="text-zinc-400">Monitor and control your dropshipping automation</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleAutomation}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition ${
                data.automationEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
              }`}
            >
              <Power className="h-4 w-4" />
              Automation {data.automationEnabled ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>

        {jobMessage && (
          <div
            id="admin-job-message"
            className={`mb-8 rounded-xl border px-4 py-3 text-sm ${
              jobMessage.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {jobMessage.text}
          </div>
        )}

        {/* CJ Dropshipping connection */}
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">CJ Dropshipping (UK)</h2>
              <p className="text-sm text-zinc-400">{data.cj.message}</p>
              {data.cj.email && (
                <p className="mt-1 text-sm text-zinc-500">
                  Account: {data.cj.email}
                  {data.cj.isSandbox ? " · Sandbox" : " · Live"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {data.cj.connected ? (
                <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400">
                  <XCircle className="h-4 w-4" />
                  {data.cj.configured ? "Connection failed" : "Not configured"}
                </span>
              )}
            </div>
          </div>
          {!data.cj.configured && (
            <div className="mt-4 rounded-xl bg-zinc-800/50 p-4 text-sm text-zinc-300">
              <p className="font-medium text-white">Setup steps:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-400">
                <li>Create a free account at cjdropshipping.com</li>
                <li>
                  <strong className="text-zinc-300">Easiest:</strong> add your CJ login to{" "}
                  <code className="text-violet-300">.env.local</code> —{" "}
                  <code className="text-violet-300">CJ_EMAIL=</code> and{" "}
                  <code className="text-violet-300">CJ_PASSWORD=</code>
                </li>
                <li>
                  Or find an API key: main sidebar → <strong className="text-zinc-300">Apps</strong> (not My CJ), or open{" "}
                  <code className="text-violet-300">cjdropshipping.com/my.html#/authorize/api</code> while logged in
                </li>
                <li>Restart the dev server and click Sync Trending Products</li>
              </ol>
            </div>
          )}
        </div>

        {/* Stripe payments */}
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Stripe (GBP)</h2>
              <p className="text-sm text-zinc-400">
                {data.stripe.configured
                  ? `Card payments active — ${data.stripe.mode} mode`
                  : "Demo checkout only — add Stripe keys to .env.local"}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Meta Pixel:{" "}
                {data.metaPixel.configured ? (
                  <span className="text-emerald-400">Active (Purchase + Checkout tracking)</span>
                ) : (
                  <span className="text-amber-400">Add NEXT_PUBLIC_META_PIXEL_ID in Railway</span>
                )}
              </p>
            </div>
            <div>
              {data.stripe.configured ? (
                <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  {data.stripe.mode === "live" ? "Live payments" : "Test mode"}
                </span>
              ) : (
                <span className="flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
                  <DollarSign className="h-4 w-4" />
                  Demo checkout
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Social marketing */}
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Social Auto-Posting</h2>
              <p className="text-sm text-zinc-400">
                {data.social.enabled
                  ? `Active on ${data.social.platforms.join(", ") || "no platforms"} · ${data.social.schedule}`
                  : "Add SOCIAL_WEBHOOK_URL in Railway (Zapier or Make webhook) to start posting"}
              </p>
              {data.socialLastRun && (
                <p className="mt-1 text-xs text-zinc-600">
                  Last run: {new Date(data.socialLastRun).toLocaleString()}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={toggleSocial}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                data.socialPostingEnabled
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {data.socialPostingEnabled ? "Posting enabled" : "Posting paused"}
            </button>
            <button
              type="button"
              onClick={testMakeWebhook}
              disabled={testingWebhook}
              className="rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"
            >
              {testingWebhook ? "Sending…" : "Test Make Webhook"}
            </button>
          </div>

          {!data.social.configured.webhook &&
            !data.social.configured.pinterest &&
            !data.social.configured.facebook &&
            !data.social.configured.instagram && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-zinc-300">
                <p className="font-medium text-amber-200">Option A — Make.com (Instagram + Facebook + TikTok)</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-400">
                  <li>Create a Make scenario → <strong className="text-zinc-300">Webhooks → Custom webhook</strong>.</li>
                  <li>Add Railway variable: <code className="text-violet-300">SOCIAL_WEBHOOK_URL</code></li>
                  <li>Add modules: <strong className="text-zinc-300">Facebook Pages → Create a Post</strong>, <strong className="text-zinc-300">Instagram → Create a Post</strong>, <strong className="text-zinc-300">TikTok → Upload Video/Photo</strong> (map fields from webhook JSON: caption, image_url, product_url).</li>
                  <li>Test with <strong className="text-zinc-300">Test Make Webhook</strong> (sends sample data without posting).</li>
                </ol>
                <p className="mt-4 font-medium text-amber-200">Option B — Direct Meta API (Instagram + Facebook)</p>
                <p className="mt-1 text-zinc-400">
                  Add <code className="text-violet-300">META_PAGE_ID</code>,{" "}
                  <code className="text-violet-300">META_PAGE_ACCESS_TOKEN</code>, and set{" "}
                  <code className="text-violet-300">SOCIAL_PLATFORMS=webhook,facebook,instagram</code> in Railway.
                </p>
              </div>
            )}

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {(
              [
                ["Webhook (Make)", data.social.configured.webhook],
                ["Facebook Page", data.social.configured.facebook],
                ["Instagram", data.social.configured.instagram],
                ["Pinterest", data.social.configured.pinterest],
              ] as const
            ).map(([label, ok]) => (
              <span
                key={label}
                className={`rounded-full px-3 py-1 ${
                  ok ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {label}
              </span>
            ))}
          </div>

          {data.social.preview && (
            <div className="mt-4 rounded-xl bg-zinc-800/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Next post preview</p>
              <p className="mt-2 font-medium text-white">{data.social.preview.title}</p>
              <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-zinc-400">
                {data.social.preview.caption}
              </pre>
            </div>
          )}

          {data.social.recentPosts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Recent posts</p>
              <ul className="space-y-2 text-sm">
                {data.social.recentPosts.map((post) => (
                  <li key={post.id} className="flex items-center gap-2 text-zinc-400">
                    {post.status === "posted" ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <span className="capitalize text-zinc-300">{post.platform}</span>
                    <span className="truncate">{post.product_url.replace(/^https?:\/\/[^/]+/, "")}</span>
                    {post.post_url && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto shrink-0 text-violet-400 hover:text-violet-300"
                      >
                        View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* TikTok Shop */}
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">TikTok Shop Sync</h2>
              <p className="text-sm text-zinc-400">{data.tiktokShop.message}</p>
              {data.tiktokShop.configured && (
                <p className="mt-1 text-xs text-zinc-600">
                  {data.tiktokShop.syncedCount} product(s) listed on TikTok Shop · auto-sync 04:00 daily
                </p>
              )}
            </div>
            {data.tiktokShop.configured && (
              <span
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                  data.tiktokShop.connected
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {data.tiktokShop.connected ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Connected
                  </>
                ) : (
                  "Not connected"
                )}
              </span>
            )}
          </div>
          {!data.tiktokShop.configured && (
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-zinc-400">
              <li>
                Register at{" "}
                <a
                  href="https://partner.tiktokshop.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300"
                >
                  TikTok Shop Partner Center
                </a>{" "}
                and create an app (UK seller account required).
              </li>
              <li>Complete OAuth and copy app key, secret, access token, and shop cipher.</li>
              <li>
                Add Railway vars: <code className="text-violet-300">TIKTOK_SHOP_APP_KEY</code>,{" "}
                <code className="text-violet-300">TIKTOK_SHOP_APP_SECRET</code>,{" "}
                <code className="text-violet-300">TIKTOK_SHOP_ACCESS_TOKEN</code>,{" "}
                <code className="text-violet-300">TIKTOK_SHOP_CIPHER</code>,{" "}
                <code className="text-violet-300">TIKTOK_SHOP_DEFAULT_CATEGORY_ID</code>
              </li>
              <li>Run <strong className="text-zinc-300">Sync TikTok Shop</strong> below (5 products per run).</li>
            </ol>
          )}
        </div>

        {/* Hero products — auto-picked for ads & TikTok */}
        {data.heroProducts.length > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <h2 className="text-lg font-semibold text-white">Hero Products</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Auto-picked for Meta ads & TikTok — pinned heroes are never auto-hidden from the shop
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {data.heroProducts.map((hero, i) => (
                <div
                  key={hero.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
                    Hero #{i + 1} · score {hero.score}
                    {hero.pinned && (
                      <span className="ml-2 normal-case text-emerald-400">· Pinned</span>
                    )}
                  </p>
                  <p className="mt-2 line-clamp-2 font-medium text-white">{hero.title}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {formatPrice(hero.retailPrice)} · £{hero.marginGbp.toFixed(2)} margin (
                    {hero.marginPercent}%)
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{hero.reasons.join(" · ")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      [
                        ["fb", "Meta ad", hero.adUrlFacebook],
                        ["ig", "Instagram", hero.adUrlInstagram],
                        ["tt", "TikTok", hero.adUrlTikTok],
                      ] as const
                    ).map(([key, label, url]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => copyAdUrl(`${hero.id}-${key}`, url)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-violet-500/40 hover:text-white"
                      >
                        {copiedAdUrl === `${hero.id}-${key}` ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedAdUrl === `${hero.id}-${key}` ? "Copied" : label}
                      </button>
                    ))}
                  </div>
                  <a
                    href={hero.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-violet-400 hover:text-violet-300"
                  >
                    View product →
                  </a>

                  <div className="mt-4 rounded-lg border border-zinc-700/80 bg-zinc-950/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-pink-400">
                      TikTok — paste manually
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                      <span className="font-medium text-white">Hook:</span> {hero.tiktokPost.hook}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(
                        [
                          ["caption", "Caption", hero.tiktokPost.caption],
                          ["hashtags", "Hashtags", hero.tiktokPost.hashtagsLine],
                          ["script", "Video script", hero.tiktokPost.videoScript],
                          ["pin", "Pin comment", hero.tiktokPost.pinnedComment],
                          [
                            "all",
                            "Copy all",
                            [
                              "=== TIKTOK CAPTION ===",
                              hero.tiktokPost.caption,
                              "",
                              "=== VIDEO SCRIPT ===",
                              hero.tiktokPost.videoScript,
                              "",
                              "=== PIN THIS COMMENT ===",
                              hero.tiktokPost.pinnedComment,
                              "",
                              "=== ON-SCREEN TEXT ===",
                              hero.tiktokPost.onScreenText.join(" · "),
                              "",
                              `Sound: ${hero.tiktokPost.soundSuggestion}`,
                            ].join("\n"),
                          ],
                        ] as const
                      ).map(([key, label, text]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => copyTikTokField(`${hero.id}-tt-${key}`, text)}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:border-pink-500/40 hover:text-white"
                        >
                          {copiedAdUrl === `${hero.id}-tt-${key}` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {copiedAdUrl === `${hero.id}-tt-${key}` ? "Copied" : label}
                        </button>
                      ))}
                    </div>
                    <details className="mt-2 group">
                      <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
                        On-screen text · sound · checklist
                      </summary>
                      <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-zinc-400">
                        <p>
                          <span className="text-zinc-500">On-screen:</span>{" "}
                          {hero.tiktokPost.onScreenText.join(" · ")}
                        </p>
                        <p>
                          <span className="text-zinc-500">Sound:</span> {hero.tiktokPost.soundSuggestion}
                        </p>
                        <p>
                          <span className="text-zinc-500">SEO:</span>{" "}
                          {hero.tiktokPost.seoKeywords.join(", ")}
                        </p>
                        <ul className="list-inside list-disc space-y-0.5">
                          {hero.tiktokPost.checklist.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map(({ label, value, sub, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <Icon className={`mb-2 h-5 w-5 ${color}`} />
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-sm text-zinc-500">{label}</p>
              {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Hidden products */}
        {data.hiddenProducts.length > 0 && (
          <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <EyeOff className="h-5 w-5 text-zinc-500" />
                  Hidden products
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Off the shop but still in your catalog — restore to show again (may be re-hidden on
                  next sync if over the {data.automation.catalogMaxActive} cap)
                </p>
              </div>
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm text-zinc-400">
                {data.stats.hiddenProductCount} hidden
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="py-2 pr-4 font-medium">Product</th>
                    <th className="py-2 pr-4 font-medium">Slug</th>
                    <th className="py-2 pr-4 font-medium">Why hidden</th>
                    <th className="py-2 pr-4 font-medium">Hidden</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.hiddenProducts.map((product) => (
                    <tr key={product.id} className="border-b border-zinc-800/80">
                      <td className="py-3 pr-4">
                        <p className="line-clamp-2 font-medium text-white">{product.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {formatPrice(product.retailPrice)} · trend {product.trendScore.toFixed(0)} ·{" "}
                          {product.views} views
                        </p>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-zinc-400">{product.slug}</td>
                      <td className="py-3 pr-4 text-zinc-400">{product.reason}</td>
                      <td className="py-3 pr-4 whitespace-nowrap text-zinc-500">
                        {new Date(product.hiddenAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => restoreHiddenProduct(product.id)}
                          disabled={restoringId !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-500/40 hover:text-white disabled:opacity-50"
                        >
                          {restoringId === product.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.stats.hiddenProductCount > data.hiddenProducts.length && (
              <p className="mt-3 text-xs text-zinc-600">
                Showing latest {data.hiddenProducts.length} of {data.stats.hiddenProductCount}{" "}
                hidden products
              </p>
            )}
          </div>
        )}

        {/* Manual job triggers */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Run Automation Jobs</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => runJob(id)}
                disabled={runningJob !== null}
                className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition hover:border-violet-500/50 disabled:opacity-50"
              >
                {runningJob === id ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-violet-400" />
                ) : (
                  <Play className="h-5 w-5 shrink-0 text-violet-400" />
                )}
                <div>
                  <p className="font-medium text-white">{label}</p>
                  <p className="text-sm text-zinc-500">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Automation schedule info */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Automation Schedule</h2>
            <ul className="space-y-3 text-sm">
              {(
                [
                  { label: "Product sync", schedule: data.automation.productSync, icon: RefreshCw },
                  { label: "Price & stock update", schedule: data.automation.priceStock, icon: DollarSign },
                  { label: "Order fulfillment", schedule: data.automation.fulfillment, icon: Truck },
                  { label: "Social marketing", schedule: data.automation.social, icon: Megaphone },
                  { label: "Catalog prune", schedule: data.automation.catalogPrune, icon: Sparkles },
                ] as const
              ).map(({ label, schedule, icon: Icon }) => (
                <li key={label} className="flex items-center gap-3 text-zinc-400">
                  <Icon className="h-4 w-4 text-violet-400" />
                  <span className="text-white">{label}</span>
                  <span className="ml-auto text-zinc-500">{schedule}</span>
                </li>
              ))}
            </ul>
            {data.schedulerStarted && (
              <p className="mt-4 text-xs text-zinc-600">
                Scheduler started: {new Date(data.schedulerStarted).toLocaleString()}
              </p>
            )}
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
              <p className="font-medium text-zinc-300">
                Trend discovery · deploy {data.automation.deployCommit}
              </p>
              <p className="mt-1">
                Sync limit: {data.automation.syncLimit} products · Max active:{" "}
                {data.automation.catalogMaxActive} · Prune after {data.automation.pruneAfterDays}{" "}
                days
              </p>
              <p className="mt-1">
                Keywords: {data.automation.trendKeywords.count || "—"} merged
                {data.automation.trendKeywords.count > 0 && (
                  <>
                    {" "}
                    (Google {data.automation.trendKeywords.google}, TikTok{" "}
                    {data.automation.trendKeywords.tiktok})
                  </>
                )}
              </p>
              {data.automation.trendKeywords.sample.length > 0 && (
                <p className="mt-1 text-zinc-500">
                  {data.automation.trendKeywords.sample.join(", ")}
                  {data.automation.trendKeywords.count > 8 ? "…" : ""}
                </p>
              )}
              {data.automation.trendKeywords.count === 0 && (
                <p className="mt-1 text-amber-400/90">
                  Run Sync Trending Products to refresh Google/TikTok keywords
                </p>
              )}
            </div>
          </div>

          {/* Recent logs */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Automation Logs</h2>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {data.logs.length === 0 ? (
                <p className="text-sm text-zinc-500">No logs yet</p>
              ) : (
                data.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 rounded-lg bg-zinc-800/50 p-3 text-sm"
                  >
                    {log.status === "success" ? (
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <div>
                      <p className="text-zinc-300">{log.message}</p>
                      <p className="text-xs text-zinc-600">
                        {log.job_type} · {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent orders */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
            {(data.recentOrders.filter((o) => o.status === "pending").length ?? 0) > 0 && (
              <button
                type="button"
                onClick={deletePendingOrders}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                Remove pending demo orders (
                {data.recentOrders.filter((o) => o.status === "pending").length})
              </button>
            )}
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-zinc-500">No orders yet — place a demo order from the cart</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Total</th>
                    <th className="pb-3">Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-zinc-800/50">
                      <td className="py-3 pr-4 text-zinc-300">{order.customer_email}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs capitalize text-violet-300">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white">{formatPrice(order.total)}</td>
                      <td className="py-3 font-mono text-xs text-zinc-500">
                        {order.tracking_number ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
