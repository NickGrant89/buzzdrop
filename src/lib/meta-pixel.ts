/** Meta (Facebook) Pixel — client-side only. Set NEXT_PUBLIC_META_PIXEL_ID in Railway. */

declare global {
  interface Window {
    fbq?: (
      action: string,
      event: string,
      params?: Record<string, unknown>,
      options?: { eventID?: string }
    ) => void;
    _fbq?: unknown;
  }
}

export function getMetaPixelId(): string {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
}

export function isMetaPixelEnabled(): boolean {
  return getMetaPixelId().length > 0;
}

export function createMetaEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getFbclidFromLocation(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URL(window.location.href).searchParams.get("fbclid") ?? undefined;
}

function syncMetaCapiEvent(payload: {
  eventName: "PageView" | "ViewContent";
  eventId: string;
  eventSourceUrl: string;
  fbclid?: string;
  productId?: string;
}) {
  fetch("/api/meta/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (options?.eventID) {
    window.fbq("track", event, params ?? {}, { eventID: options.eventID });
  } else {
    window.fbq("track", event, params ?? {});
  }
}

export function trackPageView() {
  if (typeof window === "undefined" || !window.fbq) return;

  const eventId = createMetaEventId("pv");
  const eventSourceUrl = window.location.href;

  trackMetaEvent("PageView", {}, { eventID: eventId });
  syncMetaCapiEvent({
    eventName: "PageView",
    eventId,
    eventSourceUrl,
    fbclid: getFbclidFromLocation(),
  });
}

export function trackViewContent(
  product: {
    id: string;
    title: string;
    retail_price: number;
  },
  eventId: string
) {
  trackMetaEvent(
    "ViewContent",
    {
      content_ids: [product.id],
      content_name: product.title,
      content_type: "product",
      value: product.retail_price,
      currency: "GBP",
    },
    { eventID: eventId }
  );
}

export function trackInitiateCheckout(payload: {
  orderId: string;
  total: number;
  productIds: string[];
  numItems: number;
}) {
  const key = `meta_pixel_ic_${payload.orderId}`;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
  trackMetaEvent(
    "InitiateCheckout",
    {
      content_ids: payload.productIds,
      value: payload.total,
      currency: "GBP",
      num_items: payload.numItems,
    },
    { eventID: `ic_${payload.orderId}` }
  );
  sessionStorage.setItem(key, "1");
}

export function trackPurchase(payload: {
  orderId: string;
  total: number;
  productIds: string[];
  numItems: number;
}) {
  const key = `meta_pixel_purchase_${payload.orderId}`;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
  trackMetaEvent(
    "Purchase",
    {
      content_ids: payload.productIds,
      value: payload.total,
      currency: "GBP",
      num_items: payload.numItems,
      order_id: payload.orderId,
    },
    { eventID: `purchase_${payload.orderId}` }
  );
  sessionStorage.setItem(key, "1");
}

export function buildAdUrl(
  productUrl: string,
  source: "facebook" | "tiktok" | "instagram",
  campaign: string
): string {
  const url = new URL(productUrl);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "paid");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}
