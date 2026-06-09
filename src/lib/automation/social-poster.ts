import { v4 as uuidv4 } from "uuid";
import { db, getSetting, setSetting, type Product } from "../db";
import { logAutomation } from "./logger";
import { buildMarketingPost } from "../marketing/caption";
import { getSocialConfig, isSocialPostingEnabled, type SocialPlatform } from "../marketing/social-config";
import { postToWebhook } from "../marketing/platforms/webhook";
import { postToPinterest } from "../marketing/platforms/pinterest";
import { postToFacebookPage } from "../marketing/platforms/facebook";
import { postToInstagram } from "../marketing/platforms/instagram";

export type SocialPost = {
  id: string;
  product_id: string;
  platform: string;
  caption: string;
  image_url: string;
  product_url: string;
  post_url: string | null;
  external_id: string | null;
  status: "posted" | "failed" | "skipped";
  error_message: string | null;
  posted_at: string | null;
  created_at: string;
};

function isSocialEnabledInSettings(): boolean {
  return getSetting("social_posting_enabled", "true") === "true";
}

export function getNextProductForSocial(repostAfterDays: number): Product | undefined {
  const cutoff = new Date(Date.now() - repostAfterDays * 24 * 60 * 60 * 1000).toISOString();

  return db
    .prepare(
      `SELECT p.* FROM products p
       WHERE p.is_active = 1
         AND p.supplier_pid != ''
         AND p.id NOT IN (
           SELECT product_id FROM social_posts
           WHERE status = 'posted' AND posted_at > ?
         )
       ORDER BY p.trend_score DESC
       LIMIT 1`
    )
    .get(cutoff) as Product | undefined;
}

async function postToPlatform(
  platform: SocialPlatform,
  product: Product,
  payload: ReturnType<typeof buildMarketingPost>
): Promise<{ externalId: string; postUrl?: string }> {
  const config = getSocialConfig();

  switch (platform) {
    case "webhook":
      return postToWebhook(config.webhookUrl, product.id, payload);
    case "pinterest":
      return postToPinterest(config.pinterestToken, config.pinterestBoardId, payload);
    case "facebook":
      return postToFacebookPage(config.metaPageId, config.metaPageToken, payload);
    case "instagram":
      return postToInstagram(config.metaPageId, config.metaPageToken, payload);
  }
}

function recordSocialPost(row: Omit<SocialPost, "id" | "created_at">) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO social_posts (
      id, product_id, platform, caption, image_url, product_url,
      post_url, external_id, status, error_message, posted_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuidv4(),
    row.product_id,
    row.platform,
    row.caption,
    row.image_url,
    row.product_url,
    row.post_url,
    row.external_id,
    row.status,
    row.error_message,
    row.posted_at,
    now
  );
}

export async function runSocialPosting(): Promise<{
  posted: number;
  failed: number;
  skipped: string;
}> {
  if (!isSocialPostingEnabled() || !isSocialEnabledInSettings()) {
    return { posted: 0, failed: 0, skipped: "Social posting disabled" };
  }

  const config = getSocialConfig();
  if (config.platforms.length === 0) {
    return {
      posted: 0,
      failed: 0,
      skipped: "No platforms configured — add SOCIAL_WEBHOOK_URL in Railway and redeploy",
    };
  }

  let posted = 0;
  let failed = 0;

  for (let i = 0; i < config.postsPerRun; i++) {
    const product = getNextProductForSocial(config.repostAfterDays);
    if (!product) {
      await logAutomation("social_post", "success", "All products recently posted — waiting for rotation");
      return { posted: 0, failed: 0, skipped: "All products posted in the last 14 days — use Test Make Webhook or wait for rotation" };
    }

    const payload = buildMarketingPost(product);

    for (const platform of config.platforms) {
      try {
        const result = await postToPlatform(platform, product, payload);
        recordSocialPost({
          product_id: product.id,
          platform,
          caption: payload.caption,
          image_url: payload.imageUrl,
          product_url: payload.productUrl,
          post_url: result.postUrl ?? null,
          external_id: result.externalId,
          status: "posted",
          error_message: null,
          posted_at: new Date().toISOString(),
        });
        posted++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        recordSocialPost({
          product_id: product.id,
          platform,
          caption: payload.caption,
          image_url: payload.imageUrl,
          product_url: payload.productUrl,
          post_url: null,
          external_id: null,
          status: "failed",
          error_message: message,
          posted_at: null,
        });
        failed++;
        await logAutomation("social_post", "error", `${platform}: ${message}`);
      }
    }
  }

  setSetting("social_last_run_at", new Date().toISOString());

  if (posted > 0) {
    await logAutomation(
      "social_post",
      "success",
      `Posted ${posted} marketing update(s)${failed ? `, ${failed} failed` : ""}`
    );
  }

  return { posted, failed, skipped: "" };
}

/** Fire the Make/Zapier webhook once without recording a social post (for setup/testing). */
export async function testSocialWebhook(): Promise<{ success: boolean; message: string }> {
  const config = getSocialConfig();
  if (!config.webhookUrl) {
    return {
      success: false,
      message: "SOCIAL_WEBHOOK_URL is missing in Railway — add your Make.com webhook URL and redeploy",
    };
  }

  const product = getNextProductForSocial(0) ?? (
    db
      .prepare("SELECT * FROM products WHERE is_active = 1 ORDER BY trend_score DESC LIMIT 1")
      .get() as Product | undefined
  );

  const payload = product
    ? buildMarketingPost(product)
    : {
        title: "BuzzDrop Test Product",
        caption: "Test post from BuzzDrop admin — your Make webhook is working.",
        hashtags: "#buzzdrop #test",
        productUrl: "https://www.buzzdrop.co.uk",
        imageUrl: "https://www.buzzdrop.co.uk/og-image.png",
        priceLabel: "£9.99",
        category: "Test",
      };

  try {
    await postToWebhook(config.webhookUrl, product?.id ?? "test", payload);
    return {
      success: true,
      message: "Webhook sent to Make — open your scenario and click Redetermine data structure",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message };
  }
}

export function getRecentSocialPosts(limit = 10): SocialPost[] {
  return db
    .prepare("SELECT * FROM social_posts ORDER BY created_at DESC LIMIT ?")
    .all(limit) as SocialPost[];
}

export function previewNextSocialPost(): {
  product: Product;
  payload: ReturnType<typeof buildMarketingPost>;
} | null {
  const config = getSocialConfig();
  const product = getNextProductForSocial(config.repostAfterDays);
  if (!product) return null;
  return { product, payload: buildMarketingPost(product) };
}
