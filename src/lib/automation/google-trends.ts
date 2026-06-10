import { trendDiscoveryConfig } from "@/lib/config/trend-discovery";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "news",
  "today",
  "live",
  "score",
  "vs",
  "match",
  "weather",
  "uk",
  "bbc",
]);

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w.length <= 24 && !STOP_WORDS.has(w));
}

function extractKeywordsFromDailyTrends(payload: unknown): string[] {
  const keywords: string[] = [];
  const root = payload as {
    default?: {
      trendingSearchesDays?: Array<{
        trendingSearches?: Array<{
          title?: { query?: string };
          entityNames?: string[];
        }>;
      }>;
    };
  };

  const days = root.default?.trendingSearchesDays ?? [];
  for (const day of days) {
    for (const item of day.trendingSearches ?? []) {
      const query = item.title?.query?.trim();
      if (query) {
        for (const token of tokenize(query)) keywords.push(token);
      }
      for (const entity of item.entityNames ?? []) {
        for (const token of tokenize(entity)) keywords.push(token);
      }
    }
  }

  return keywords;
}

/** Fetch UK (or geo) daily trending search terms from Google Trends. */
export async function fetchGoogleTrendKeywords(): Promise<string[]> {
  if (!trendDiscoveryConfig.googleTrendsEnabled) return [];

  const geo = trendDiscoveryConfig.googleTrendsGeo;
  const url = `https://trends.google.com/trends/api/dailytrends?hl=en-GB&tz=0&geo=${encodeURIComponent(geo)}&ns=15`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return [];

    const raw = await res.text();
    const json = JSON.parse(raw.replace(/^\)\]\}',?\n?/, "")) as unknown;
    const tokens = extractKeywordsFromDailyTrends(json);
    const unique = [...new Set(tokens)];
    return unique.slice(0, trendDiscoveryConfig.googleTrendsMaxKeywords);
  } catch {
    return [];
  }
}
