"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductHeroMedia({
  imageUrl,
  alt,
  videoUrl,
  posterUrl,
}: {
  imageUrl: string;
  alt: string;
  videoUrl?: string;
  posterUrl?: string;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = Boolean(videoUrl) && !videoFailed;

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      {showVideo ? (
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={posterUrl}
          onError={() => setVideoFailed(true)}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      ) : (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      )}
    </div>
  );
}
