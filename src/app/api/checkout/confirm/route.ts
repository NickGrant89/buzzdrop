import { NextResponse } from "next/server";
import { z } from "zod";
import { handleCheckoutComplete, handlePaymentIntentComplete } from "@/lib/stripe";

const bodySchema = z
  .object({
    session_id: z.string().min(1).optional(),
    payment_intent_id: z.string().min(1).optional(),
  })
  .refine((body) => body.session_id || body.payment_intent_id, {
    message: "session_id or payment_intent_id required",
  });

/** Called from the order success page after Stripe redirects back. */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());

    const orderId = body.payment_intent_id
      ? await handlePaymentIntentComplete(body.payment_intent_id)
      : await handleCheckoutComplete(body.session_id!);

    if (!orderId) {
      return NextResponse.json({ error: "Payment not confirmed yet" }, { status: 400 });
    }

    return NextResponse.json({ orderId, success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirmation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
