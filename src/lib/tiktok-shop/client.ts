import crypto from "crypto";

export type TikTokShopConfig = {
  appKey: string;
  appSecret: string;
  accessToken: string;
  shopCipher: string;
  defaultCategoryId: string;
  apiBase: string;
};

export function getTikTokShopConfig(): TikTokShopConfig | null {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY?.trim() ?? "";
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET?.trim() ?? "";
  const accessToken = process.env.TIKTOK_SHOP_ACCESS_TOKEN?.trim() ?? "";
  const shopCipher = process.env.TIKTOK_SHOP_CIPHER?.trim() ?? "";
  const defaultCategoryId = process.env.TIKTOK_SHOP_DEFAULT_CATEGORY_ID?.trim() ?? "";

  if (!appKey || !appSecret || !accessToken || !shopCipher) {
    return null;
  }

  return {
    appKey,
    appSecret,
    accessToken,
    shopCipher,
    defaultCategoryId,
    apiBase: process.env.TIKTOK_SHOP_API_BASE?.trim() || "https://open-api.tiktokglobalshop.com",
  };
}

export function isTikTokShopConfigured(): boolean {
  return getTikTokShopConfig() !== null;
}

function signRequest(appSecret: string, path: string, query: Record<string, string>, body: string): string {
  const sorted = Object.keys(query)
    .sort()
    .map((key) => `${key}${query[key]}`)
    .join("");
  const payload = `${appSecret}${path}${sorted}${body}${appSecret}`;
  return crypto.createHmac("sha256", appSecret).update(payload).digest("hex");
}

export async function tiktokShopRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const config = getTikTokShopConfig();
  if (!config) {
    throw new Error("TikTok Shop not configured");
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyStr = body ? JSON.stringify(body) : "";
  const query: Record<string, string> = {
    app_key: config.appKey,
    timestamp,
    shop_cipher: config.shopCipher,
    access_token: config.accessToken,
  };
  query.sign = signRequest(config.appSecret, path, query, bodyStr);

  const url = new URL(`${config.apiBase}${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? bodyStr : undefined,
  });

  const data = (await res.json().catch(() => ({}))) as {
    code?: number;
    message?: string;
    data?: T;
  };

  if (!res.ok || (data.code != null && data.code !== 0)) {
    throw new Error(data.message ?? `TikTok Shop API error (${res.status})`);
  }

  return data.data as T;
}

export async function testTikTokShopConnection(): Promise<{
  connected: boolean;
  message: string;
  shopName?: string;
}> {
  if (!isTikTokShopConfigured()) {
    return {
      connected: false,
      message:
        "Add TIKTOK_SHOP_APP_KEY, TIKTOK_SHOP_APP_SECRET, TIKTOK_SHOP_ACCESS_TOKEN, and TIKTOK_SHOP_CIPHER in Railway",
    };
  }

  try {
    const data = await tiktokShopRequest<{ shops?: Array<{ name?: string }> }>(
      "GET",
      "/authorization/202309/shops"
    );
    const shopName = data.shops?.[0]?.name;
    return {
      connected: true,
      message: shopName ? `Connected to ${shopName}` : "Connected to TikTok Shop",
      shopName,
    };
  } catch (err) {
    return {
      connected: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
