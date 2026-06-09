import type { MarketingPostPayload } from "../caption";

async function resolveInstagramAccountId(
  pageId: string,
  pageAccessToken: string
): Promise<string> {
  const override = process.env.META_INSTAGRAM_ACCOUNT_ID?.trim();
  if (override) return override;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
  );
  const data = (await res.json()) as {
    instagram_business_account?: { id?: string };
    error?: { message?: string };
  };

  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message ??
        "No Instagram account linked to this Facebook Page — connect one in Meta Business Suite"
    );
  }

  const igId = data.instagram_business_account?.id;
  if (!igId) {
    throw new Error(
      "Link an Instagram Business account to your Facebook Page in Meta Business Suite"
    );
  }

  return igId;
}

export async function postToInstagram(
  pageId: string,
  pageAccessToken: string,
  payload: MarketingPostPayload
): Promise<{ externalId: string; postUrl?: string }> {
  const igAccountId = await resolveInstagramAccountId(pageId, pageAccessToken);

  const createParams = new URLSearchParams({
    image_url: payload.imageUrl,
    caption: payload.caption.slice(0, 2200),
    access_token: pageAccessToken,
  });

  const createRes = await fetch(
    `https://graph.facebook.com/v21.0/${igAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createParams,
    }
  );

  const createData = (await createRes.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!createRes.ok || createData.error || !createData.id) {
    throw new Error(createData.error?.message ?? `Instagram media create failed (${createRes.status})`);
  }

  const publishParams = new URLSearchParams({
    creation_id: createData.id,
    access_token: pageAccessToken,
  });

  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishParams,
    }
  );

  const publishData = (await publishRes.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!publishRes.ok || publishData.error) {
    throw new Error(publishData.error?.message ?? `Instagram publish failed (${publishRes.status})`);
  }

  let postUrl: string | undefined;
  if (publishData.id) {
    const linkRes = await fetch(
      `https://graph.facebook.com/v21.0/${publishData.id}?fields=permalink&access_token=${pageAccessToken}`
    );
    const linkData = (await linkRes.json()) as { permalink?: string };
    postUrl = linkData.permalink;
  }

  return {
    externalId: publishData.id ?? createData.id,
    postUrl,
  };
}
