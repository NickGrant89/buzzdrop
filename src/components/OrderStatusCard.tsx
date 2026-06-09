import { Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  formatOrderStatus,
  orderStatusTone,
  trackingUrl,
  type PublicOrder,
  type PublicOrderItem,
} from "@/lib/order-display";

const toneClasses = {
  neutral: "text-violet-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

export function OrderStatusCard({
  order,
  items,
}: {
  order: PublicOrder;
  items: PublicOrderItem[];
}) {
  const tone = orderStatusTone(order.status);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-left">
      <p className="text-sm text-zinc-500">Order number</p>
      <p className="mb-4 break-all font-mono text-sm text-white">{order.id}</p>

      <p className="text-sm text-zinc-500">Status</p>
      <p className={`mb-4 capitalize ${toneClasses[tone]}`}>
        {formatOrderStatus(order.status)}
      </p>

      <p className="text-sm text-zinc-500">Placed</p>
      <p className="mb-4 text-sm text-zinc-300">
        {new Date(order.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <p className="text-sm text-zinc-500">Total</p>
      <p className="mb-4 text-lg font-bold text-white">{formatPrice(order.total)}</p>

      <p className="mb-2 text-sm text-zinc-500">Items</p>
      <ul className="mb-4 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-400">
            {item.quantity}x {item.title}
          </li>
        ))}
      </ul>

      {order.tracking_number ? (
        <div className="flex flex-col gap-2 rounded-lg bg-emerald-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="text-sm text-emerald-400">
              Tracking: {order.tracking_number}
            </span>
          </div>
          <a
            href={trackingUrl(order.tracking_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-emerald-300 underline hover:text-emerald-200"
          >
            Track parcel
          </a>
        </div>
      ) : order.status === "shipped" || order.status === "fulfilled" || order.status === "paid" ? (
        <p className="rounded-lg bg-zinc-800/80 p-3 text-sm text-zinc-400">
          Tracking will appear here once your parcel is dispatched. Check back soon or watch
          for a shipping email.
        </p>
      ) : null}
    </div>
  );
}
