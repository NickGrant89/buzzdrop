import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  return NextResponse.json({
    configured: isStripeConfigured(),
    mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
  });
}
