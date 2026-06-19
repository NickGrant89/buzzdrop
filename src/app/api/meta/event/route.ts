import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductById } from "@/lib/products";
import {
  buildMetaUserDataFromRequest,
  sendMetaCapiEvent,
} from "@/lib/meta-capi";

const bodySchema = z.object({
  eventName: z.enum(["PageView", "ViewContent", "AddToCart"]),
  eventId: z.string().min(8).max(128),
  eventSourceUrl: z.string().url(),
  fbclid: z.string().optional(),
  productId: z.string().optional(),
  quantity: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userData = buildMetaUserDataFromRequest(request, {
      fbclid: body.fbclid,
      eventSourceUrl: body.eventSourceUrl,
      country: "gb",
    });

    if (body.eventName === "PageView") {
      await sendMetaCapiEvent("PageView", {
        eventId: body.eventId,
        eventSourceUrl: body.eventSourceUrl,
        userData,
      });
      return NextResponse.json({ ok: true });
    }

    if (!body.productId) {
      return NextResponse.json({ ok: false, error: "productId required" }, { status: 400 });
    }

    const product = getProductById(body.productId);
    if (!product) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const quantity = body.quantity ?? 1;

    if (body.eventName === "AddToCart") {
      await sendMetaCapiEvent("AddToCart", {
        eventId: body.eventId,
        eventSourceUrl: body.eventSourceUrl,
        userData,
        customData: {
          value: product.retail_price * quantity,
          currency: "GBP",
          contentIds: [product.id],
          contentName: product.title,
          numItems: quantity,
        },
      });
      return NextResponse.json({ ok: true });
    }

    await sendMetaCapiEvent("ViewContent", {
      eventId: body.eventId,
      eventSourceUrl: body.eventSourceUrl,
      userData,
      customData: {
        value: product.retail_price,
        currency: "GBP",
        contentIds: [product.id],
        contentName: product.title,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
