import { NextResponse } from "next/server";
import { trendDiscoveryConfig } from "@/lib/config/trend-discovery";

export async function GET() {
  const commit =
    process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.GIT_COMMIT?.slice(0, 7) ??
    "local";

  return NextResponse.json({
    ok: true,
    service: "buzzdrop",
    commit,
    trendDiscovery: true,
    syncLimit: trendDiscoveryConfig.syncLimit,
    syncCron: trendDiscoveryConfig.syncCron,
  });
}
