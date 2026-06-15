import { NextResponse } from "next/server";
import { getManualPaymentPublic } from "@/lib/manual-payments";
import { createManualPaymentCheckout, isStripeConfigured } from "@/lib/stripe";

function appUrlFromRequest(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    request.headers.get("origin") ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const payment = getManualPaymentPublic(orderId);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...payment,
    stripeEnabled: isStripeConfigured(),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const result = await createManualPaymentCheckout(orderId, appUrlFromRequest(request));

    if (result.demo) {
      return NextResponse.json({
        demo: true,
        orderId: result.orderId,
        url: `${appUrlFromRequest(request)}/order/success?order_id=${result.orderId}&demo=true`,
      });
    }

    return NextResponse.json({ url: result.url, orderId: result.orderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
