import { NextResponse } from "next/server";
import { recordProductView } from "@/lib/products-views";
import { getProductById } from "@/lib/products";
import {
  getClientIp,
  parseMetaCookies,
  sendMetaCapiEvent,
} from "@/lib/meta-capi";
import { getSiteUrl } from "@/lib/seo";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : "";

  if (!productId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  recordProductView(productId);

  const product = getProductById(productId);
  if (product) {
    const metaCookies = parseMetaCookies(request.headers.get("cookie"));
    await sendMetaCapiEvent("ViewContent", {
      eventId: `vc_${productId}_${Math.floor(Date.now() / 60000)}`,
      eventSourceUrl: `${getSiteUrl()}/product/${product.slug}`,
      userData: {
        ip: getClientIp(request),
        userAgent: request.headers.get("user-agent") ?? undefined,
        fbp: metaCookies.fbp,
        fbc: metaCookies.fbc,
        country: "gb",
      },
      customData: {
        value: product.retail_price,
        currency: "GBP",
        contentIds: [product.id],
        contentName: product.title,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
