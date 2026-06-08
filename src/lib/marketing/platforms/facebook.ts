import type { MarketingPostPayload } from "../caption";

export async function postToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  payload: MarketingPostPayload
): Promise<{ externalId: string; postUrl?: string }> {
  const params = new URLSearchParams({
    message: payload.caption.slice(0, 2000),
    link: payload.productUrl,
    access_token: pageAccessToken,
  });

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Facebook API error (${res.status})`);
  }

  return {
    externalId: data.id ?? `fb-${Date.now()}`,
    postUrl: data.id ? `https://www.facebook.com/${data.id}` : undefined,
  };
}
