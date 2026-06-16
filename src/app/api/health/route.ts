import { NextResponse } from "next/server";
import { trendDiscoveryConfig } from "@/lib/config/trend-discovery";
import { db, getSetting } from "@/lib/db";
import { isSocialPostingEnabled } from "@/lib/marketing/social-config";
import { isMetaCapiConfigured } from "@/lib/meta-capi";

function countSocialPostsSince(iso: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM social_posts
       WHERE status = 'posted' AND posted_at >= ?`
    )
    .get(iso) as { n: number };
  return row.n;
}

export async function GET() {
  const commit =
    process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.GIT_COMMIT?.slice(0, 7) ??
    "local";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return NextResponse.json({
    ok: true,
    service: "buzzdrop",
    commit,
    trendDiscovery: true,
    syncLimit: trendDiscoveryConfig.syncLimit,
    syncCron: trendDiscoveryConfig.syncCron,
    social: {
      enabled: isSocialPostingEnabled() && getSetting("social_posting_enabled", "true") === "true",
      schedule: "10:00 & 18:00 Europe/London",
      lastRun: getSetting("social_last_run_at", "") || null,
      schedulerStarted: getSetting("scheduler_started_at", "") || null,
      postsToday: countSocialPostsSince(todayStart.toISOString()),
    },
    meta: {
      pixel: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()),
      capi: isMetaCapiConfigured(),
    },
  });
}
