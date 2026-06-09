import { NextResponse } from "next/server";

/** Stripe Apple Pay domain verification file (paste contents into APPLE_PAY_DOMAIN_ASSOCIATION). */
export async function GET() {
  const body = process.env.APPLE_PAY_DOMAIN_ASSOCIATION?.trim();
  if (!body) {
    return new NextResponse("Apple Pay domain verification not configured", { status: 404 });
  }

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
