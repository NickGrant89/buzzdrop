"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export function AddToCartButton({
  onAdd,
  label = "Add to Cart",
}: {
  onAdd: () => void;
  label?: string;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        onAdd();
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98]"
    >
      {added ? "Added!" : label}
    </button>
  );
}

export function CheckoutButton({
  onCheckout,
  disabled,
  loading,
  total,
  label,
}: {
  onCheckout: () => void;
  disabled?: boolean;
  loading?: boolean;
  total: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onCheckout}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-lg font-semibold text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Processing...
        </>
      ) : (
        label ?? `Checkout — ${total}`
      )}
    </button>
  );
}
