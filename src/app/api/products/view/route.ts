import { NextResponse } from "next/server";
import { recordProductView } from "@/lib/products-views";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : "";

  if (!productId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  recordProductView(productId);
  return NextResponse.json({ ok: true });
}
