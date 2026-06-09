export type SocialPlatform = "webhook" | "pinterest" | "facebook" | "instagram";

export function getEnabledPlatforms(): SocialPlatform[] {
  const raw = process.env.SOCIAL_PLATFORMS ?? "webhook";
  return raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is SocialPlatform =>
      p === "webhook" || p === "pinterest" || p === "facebook" || p === "instagram"
    );
}

export function isSocialPostingEnabled(): boolean {
  if (process.env.SOCIAL_POSTING_ENABLED === "false") return false;
  return getSocialConfig().platforms.length > 0;
}

export function getSocialConfig() {
  const webhookUrl = process.env.SOCIAL_WEBHOOK_URL?.trim() ?? "";
  const pinterestToken = process.env.PINTEREST_ACCESS_TOKEN?.trim() ?? "";
  const pinterestBoardId = process.env.PINTEREST_BOARD_ID?.trim() ?? "";
  const metaPageToken = process.env.META_PAGE_ACCESS_TOKEN?.trim() ?? "";
  const metaPageId = process.env.META_PAGE_ID?.trim() ?? "";

  const requested = getEnabledPlatforms();
  const platforms: SocialPlatform[] = [];

  for (const platform of requested) {
    if (platform === "webhook" && webhookUrl) platforms.push("webhook");
    if (platform === "pinterest" && pinterestToken && pinterestBoardId) platforms.push("pinterest");
    if (platform === "facebook" && metaPageToken && metaPageId) platforms.push("facebook");
    if (platform === "instagram" && metaPageToken && metaPageId) platforms.push("instagram");
  }

  return {
    platforms,
    postsPerRun: Math.max(1, parseInt(process.env.SOCIAL_POSTS_PER_RUN ?? "1", 10) || 1),
    repostAfterDays: Math.max(7, parseInt(process.env.SOCIAL_REPOST_DAYS ?? "14", 10) || 14),
    webhookUrl,
    pinterestToken,
    pinterestBoardId,
    metaPageToken,
    metaPageId,
    configured: {
      webhook: Boolean(webhookUrl),
      pinterest: Boolean(pinterestToken && pinterestBoardId),
      facebook: Boolean(metaPageToken && metaPageId),
      instagram: Boolean(metaPageToken && metaPageId),
    },
  };
}
