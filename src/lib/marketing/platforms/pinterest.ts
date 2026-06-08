import type { MarketingPostPayload } from "../caption";

export async function postToPinterest(
  accessToken: string,
  boardId: string,
  payload: MarketingPostPayload
): Promise<{ externalId: string; postUrl?: string }> {
  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: boardId,
      title: payload.title.slice(0, 100),
      description: payload.caption.slice(0, 500),
      link: payload.productUrl,
      media_source: {
        source_type: "image_url",
        url: payload.imageUrl,
      },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? `Pinterest API error (${res.status})`);
  }

  return {
    externalId: data.id ?? `pin-${Date.now()}`,
    postUrl: data.id ? `https://www.pinterest.com/pin/${data.id}/` : undefined,
  };
}
