import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import { ensureVideosDir, marketingAssetPath } from "@/lib/marketing/videos";

async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  return verifyAdminSessionToken(token, process.env.ADMIN_PASSWORD);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const slug = String(form.get("slug") ?? "").trim();
  const file = form.get("file");

  if (!slug || !(file instanceof File)) {
    return NextResponse.json({ error: "slug and file required" }, { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const isJpeg =
    file.name.endsWith(".jpg") ||
    file.name.endsWith(".jpeg") ||
    file.type === "image/jpeg";

  if (!file.name.endsWith(".mp4") && file.type !== "video/mp4" && !isJpeg) {
    return NextResponse.json({ error: "MP4 or JPEG only" }, { status: 400 });
  }

  const maxBytes = isJpeg ? 5 * 1024 * 1024 : 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${isJpeg ? "5MB" : "25MB"})` },
      { status: 400 }
    );
  }

  ensureVideosDir();
  const dest = marketingAssetPath(slug, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buffer);

  const site = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.buzzdrop.co.uk";
  const url = isJpeg
    ? `${site}/social/videos/${slug.endsWith("-slide") ? slug : `${slug}-slide`}.jpg`
    : `${site}/social/videos/${slug}-ad.mp4`;

  return NextResponse.json({
    ok: true,
    slug,
    path: dest,
    url,
    bytes: buffer.length,
  });
}
