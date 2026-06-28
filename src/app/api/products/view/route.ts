import { NextResponse } from "next/server";
import { z } from "zod";
import { recordProductView } from "@/lib/products-views";
import { getProductById } from "@/lib/products";
import { getProductDisplayPrice } from "@/lib/automation/pricing";
import { buildMetaUserDataFromRequest, sendMetaCapiEvent } from "@/lib/meta-capi";
import { getSiteUrl } from "@/lib/seo";

const bodySchema = z.object({
  productId: z.string().min(1),
  eventId: z.string().min(8).max(128).optional(),
  eventSourceUrl: z.string().url().optional(),
  fbclid: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { productId, eventId, eventSourceUrl, fbclid } = parsed.data;

  recordProductView(productId);

  const product = getProductById(productId);
  if (product) {
    const userData = buildMetaUserDataFromRequest(request, {
      fbclid,
      eventSourceUrl,
      country: "gb",
    });

    await sendMetaCapiEvent("ViewContent", {
      eventId:
        eventId ??
        `vc_${productId}_${Math.floor(Date.now() / 60000)}`,
      eventSourceUrl: eventSourceUrl ?? `${getSiteUrl()}/product/${product.slug}`,
      userData,
      customData: {
        value: getProductDisplayPrice(product),
        currency: "GBP",
        contentIds: [product.id],
        contentName: product.title,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
