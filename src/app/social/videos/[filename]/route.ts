import { readFileSync, existsSync } from "fs";
import { NextResponse } from "next/server";
import { getVideosDir } from "@/lib/marketing/videos";

const ALLOWED = /^[a-z0-9-]+(?:-ad\.mp4|-slide\.jpg)$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!ALLOWED.test(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const path = `${getVideosDir()}/${filename}`;
  if (!existsSync(path)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = readFileSync(path);
  const type = filename.endsWith(".mp4") ? "video/mp4" : "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
