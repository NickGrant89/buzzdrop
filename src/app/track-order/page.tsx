import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";
import TrackOrderClient from "./TrackOrderClient";

export const metadata: Metadata = buildPageMetadata({
  title: "Track Order",
  description: "Track your BuzzDrop order status and delivery with your email and order number.",
  path: "/track-order",
});

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      }
    >
      <TrackOrderClient />
    </Suspense>
  );
}
