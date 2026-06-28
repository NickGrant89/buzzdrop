import { CreditCard, Mail, RotateCcw, Truck } from "lucide-react";

import { SHIPPING_BADGE, SUPPORT_EMAIL } from "@/lib/store-copy";

export function ProductTrustStrip() {
  const items = [
    { icon: Truck, label: SHIPPING_BADGE },
    { icon: CreditCard, label: "Secure Stripe checkout" },
    { icon: RotateCcw, label: "14-day returns" },
    {
      icon: Mail,
      label: "Email support",
      href: `mailto:${SUPPORT_EMAIL}`,
      detail: SUPPORT_EMAIL,
    },
  ] as const;

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <Icon className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="text-xs font-medium leading-tight text-zinc-200">
              {item.label}
              {"detail" in item && item.detail ? (
                <span className="mt-0.5 block font-normal text-zinc-500">{item.detail}</span>
              ) : null}
            </span>
          </>
        );

        return (
          <li
            key={item.label}
            className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
          >
            {"href" in item && item.href ? (
              <a href={item.href} className="flex items-start gap-2 hover:text-white">
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
