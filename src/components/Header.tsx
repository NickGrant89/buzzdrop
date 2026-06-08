"use client";

import Link from "next/link";
import { ShoppingBag, Zap } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function Header() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Buzz<span className="text-amber-400">Drop</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/#shop"
            className="hidden text-sm text-zinc-400 transition hover:text-white sm:block"
          >
            Shop
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:from-amber-400 hover:to-orange-400"
          >
            <ShoppingBag className="h-4 w-4" />
            Cart
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-amber-400 ring-2 ring-amber-500">
                {itemCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
