"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

export function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main>{children}</main>
      <footer className="mt-auto border-t border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-lg font-bold text-white">
                Buzz<span className="text-amber-400">Drop</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Viral products, delivered across the UK. Free shipping on every order.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Shop</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>
                  <Link href="/#shop" className="hover:text-zinc-300">
                    All products
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="hover:text-zinc-300">
                    Your cart
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Help</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>
                  <Link href="/returns" className="hover:text-zinc-300">
                    Returns &amp; refunds
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-zinc-300">
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:support@buzzdrop.co.uk"
                    className="hover:text-zinc-300"
                  >
                    support@buzzdrop.co.uk
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-10 border-t border-zinc-800 pt-8 text-center text-xs text-zinc-600">
            © {new Date().getFullYear()} BuzzDrop. All rights reserved.{" "}
            <Link href="/privacy" className="hover:text-zinc-400">
              Privacy
            </Link>
            {" · "}
            <Link href="/returns" className="hover:text-zinc-400">
              Returns
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
