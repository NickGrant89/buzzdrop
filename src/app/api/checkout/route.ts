import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrderPayment } from "@/lib/stripe";
import { createDemoOrder } from "@/lib/automation/fulfillment";

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1).max(10),
    })
  ).min(1),
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().min(10),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(2),
  county: z.string().optional(),
  postcode: z.string().min(5),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.parse(body);

    const details = {
      email: parsed.email,
      name: parsed.name,
      phone: parsed.phone,
      line1: parsed.line1,
      line2: parsed.line2,
      city: parsed.city,
      county: parsed.county,
      postcode: parsed.postcode.toUpperCase(),
    };

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      request.headers.get("origin") ??
      "http://localhost:3000"
    ).replace(/\/$/, "");

    const result = await createOrderPayment(parsed.items, details);

    if (result.demo) {
      const orderId = createDemoOrder(details, parsed.items);
      return NextResponse.json({
        demo: true,
        orderId,
        url: `${appUrl}/order/success?order_id=${orderId}&demo=true`,
      });
    }

    return NextResponse.json({
      clientSecret: result.clientSecret,
      orderId: result.orderId,
      total: result.total,
      email: details.email,
      name: details.name,
      phone: details.phone,
      line1: details.line1,
      line2: details.line2,
      city: details.city,
      county: details.county,
      postcode: details.postcode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
