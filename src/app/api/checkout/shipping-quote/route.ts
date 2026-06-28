import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteCartShipping } from "@/lib/checkout-shipping";
import { getProductDisplayPrice } from "@/lib/automation/pricing";
import { getProductById } from "@/lib/products";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1),
  country: z.string().length(2),
  postcode: z.string().min(2).max(20),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.parse(await request.json());

    let subtotalGbp = 0;
    for (const item of parsed.items) {
      const product = getProductById(item.productId);
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 400 });
      }
      subtotalGbp += getProductDisplayPrice(product) * item.quantity;
    }
    subtotalGbp = Math.round(subtotalGbp * 100) / 100;

    const quote = await quoteCartShipping({
      items: parsed.items,
      destCountryCode: parsed.country,
      destPostcode: parsed.postcode,
      subtotalGbp,
    });

    return NextResponse.json(quote);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not quote shipping";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
