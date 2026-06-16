import { NextResponse } from "next/server";
import { z } from "zod";
import { captureCartLead } from "@/lib/marketing/abandoned-cart";

const bodySchema = z.object({
  email: z.string().email(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1).max(10),
    })
  ).min(1),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    captureCartLead(body.email, body.items);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
