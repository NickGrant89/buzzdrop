import { trendDiscoveryConfig } from "@/lib/config/trend-discovery";

type HashtagRow = {
  hashtag_name?: string;
  hashtagName?: string;
  name?: string;
};

function normalizeHashtag(raw: string): string | null {
  const cleaned = raw
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
  if (cleaned.length < 3 || cleaned.length > 32) return null;
  return cleaned.split(/\s+/)[0] ?? null;
}

function extractHashtags(data: unknown): string[] {
  const keywords: string[] = [];

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const row = node as HashtagRow;
    const name = row.hashtag_name ?? row.hashtagName ?? row.name;
    if (typeof name === "string") {
      const kw = normalizeHashtag(name);
      if (kw) keywords.push(kw);
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === "object") walk(value);
    }
  };

  walk(data);
  return keywords;
}

async function fetchCreativeRadarHashtags(): Promise<string[]> {
  const country = trendDiscoveryConfig.tiktokTrendsCountry;
  const endpoints = [
    {
      url: "https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list",
      body: { period: 7, page: 1, limit: 20, country_code: country, sort_by: "popular" },
    },
    {
      url: "https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list",
      body: { period: 7, page: 1, limit: 20, country_code: "US", sort_by: "popular" },
    },
  ];

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en",
  };

  for (const { url, body } of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as unknown;
      const tags = extractHashtags(data);
      if (tags.length > 0) return tags;
    } catch {
      /* try next endpoint */
    }
  }

  return [];
}

/** Best-effort TikTok trending hashtags — falls back to empty if blocked. */
export async function fetchTikTokTrendKeywords(): Promise<string[]> {
  if (!trendDiscoveryConfig.tiktokTrendsEnabled) return [];

  const tags = await fetchCreativeRadarHashtags();
  const unique = [...new Set(tags.map((t) => normalizeHashtag(t)).filter(Boolean))] as string[];
  return unique.slice(0, trendDiscoveryConfig.tiktokTrendsMaxKeywords);
}
