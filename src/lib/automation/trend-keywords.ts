import { getSetting, setSetting } from "@/lib/db";
import { trendDiscoveryConfig } from "@/lib/config/trend-discovery";
import { fetchGoogleTrendKeywords } from "./google-trends";
import { fetchTikTokTrendKeywords } from "./tiktok-trends";

export type TrendKeywordSnapshot = {
  keywords: string[];
  sources: { base: string[]; google: string[]; tiktok: string[] };
  refreshedAt: string;
};

const CACHE_KEY = "trend_keywords_cache";

function parseCache(raw: string): TrendKeywordSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as TrendKeywordSnapshot;
    if (!Array.isArray(parsed.keywords)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function cacheFresh(snapshot: TrendKeywordSnapshot): boolean {
  const ageMs = Date.now() - new Date(snapshot.refreshedAt).getTime();
  return ageMs < trendDiscoveryConfig.keywordCacheHours * 60 * 60 * 1000;
}

function mergeKeywords(base: string[], google: string[], tiktok: string[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  const add = (word: string) => {
    const key = word.toLowerCase().trim();
    if (key.length < 2 || seen.has(key)) return;
    seen.add(key);
    merged.push(key);
  };

  for (const k of base) add(k);
  for (const k of google) add(k);
  for (const k of tiktok) add(k);

  return merged.slice(0, 30);
}

/** Live trend keywords for CJ search — cached in settings. */
export async function getTrendKeywords(forceRefresh = false): Promise<TrendKeywordSnapshot> {
  if (!forceRefresh) {
    const cached = parseCache(getSetting(CACHE_KEY, ""));
    if (cached && cacheFresh(cached)) return cached;
  }

  const [google, tiktok] = await Promise.all([fetchGoogleTrendKeywords(), fetchTikTokTrendKeywords()]);
  const snapshot: TrendKeywordSnapshot = {
    keywords: mergeKeywords(trendDiscoveryConfig.baseKeywords, google, tiktok),
    sources: {
      base: trendDiscoveryConfig.baseKeywords,
      google,
      tiktok,
    },
    refreshedAt: new Date().toISOString(),
  };

  setSetting(CACHE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function applyTrendKeywordBoost(
  title: string,
  description: string,
  baseScore: number,
  keywords: string[]
): number {
  const boost = trendDiscoveryConfig.trendKeywordBoost;
  if (boost <= 0 || keywords.length === 0) return baseScore;

  const haystack = `${title} ${description}`.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw.toLowerCase())) hits++;
  }

  if (hits === 0) return baseScore;
  return Math.min(99, Math.round(baseScore + Math.min(hits * 3, boost)));
}
