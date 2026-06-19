import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export function getVideosDir(): string {
  const configured = process.env.VIDEOS_PATH?.trim();
  if (configured) return configured;
  return join(process.cwd(), "public/social/videos");
}

export function videoFilePath(slug: string): string {
  return join(getVideosDir(), `${slug}-ad.mp4`);
}

export function slideFilePath(slug: string): string {
  const base = slug.endsWith("-slide") ? slug : `${slug}-slide`;
  return join(getVideosDir(), `${base}.jpg`);
}

export function marketingAssetPath(slug: string, filename: string): string {
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
    return slideFilePath(slug);
  }
  return videoFilePath(slug);
}

export function videoFileExists(slug: string): boolean {
  return existsSync(videoFilePath(slug));
}

export function ensureVideosDir(): string {
  const dir = getVideosDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}
