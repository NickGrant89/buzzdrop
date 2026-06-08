import type { MarketingPostPayload } from "../caption";

export async function postToWebhook(
  webhookUrl: string,
  productId: string,
  payload: MarketingPostPayload
): Promise<{ externalId: string; postUrl?: string }> {
  const body = {
    source: "buzzdrop",
    product_id: productId,
    title: payload.title,
    caption: payload.caption,
    hashtags: payload.hashtags,
    product_url: payload.productUrl,
    image_url: payload.imageUrl,
    price: payload.priceLabel,
    category: payload.category,
    posted_at: new Date().toISOString(),
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Webhook failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return { externalId: `webhook-${Date.now()}` };
}
