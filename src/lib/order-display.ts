const STATUS_LABELS: Record<string, string> = {
  pending: "Payment pending",
  paid: "Processing",
  fulfilled: "Processing",
  shipped: "Shipped",
  failed: "Cancelled",
};

export function formatOrderStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function orderStatusTone(
  status: string
): "neutral" | "success" | "warning" | "error" {
  if (status === "shipped") return "success";
  if (status === "failed") return "error";
  if (status === "pending") return "warning";
  return "neutral";
}

export type PublicOrderItem = {
  title: string;
  quantity: number;
  unit_price: number;
  image_url?: string;
  slug?: string;
};

export type PublicOrder = {
  id: string;
  status: string;
  total: number;
  tracking_number: string | null;
  created_at: string;
  customer_email: string;
};

export function trackingUrl(trackingNumber: string): string {
  return `https://www.17track.net/en/track?nums=${encodeURIComponent(trackingNumber)}`;
}
