import { NextResponse } from "next/server";
import { getMarketingExport } from "@/lib/marketing/export";

export async function GET(request: Request) {
  const secret = process.env.MARKETING_EXPORT_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 6, 1), 12) : 6;

  return NextResponse.json(getMarketingExport(limit), {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
