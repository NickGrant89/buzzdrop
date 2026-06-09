import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runJobManually } from "@/lib/automation/scheduler";

const VALID_JOBS = new Set(["sync", "pricing", "fulfillment", "social", "tidy", "tiktok_shop"]);

type Params = { params: Promise<{ job: string }> };

async function handleCron(request: Request, params: Params) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const { job } = await params.params;
  if (!VALID_JOBS.has(job)) {
    return NextResponse.json({ error: "Unknown job" }, { status: 400 });
  }

  const result = await runJobManually(job as "sync" | "pricing" | "fulfillment" | "social" | "tidy" | "tiktok_shop");
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

/** Vercel Cron invokes routes with GET. */
export async function GET(request: Request, params: Params) {
  return handleCron(request, params);
}

export async function POST(request: Request, params: Params) {
  return handleCron(request, params);
}
