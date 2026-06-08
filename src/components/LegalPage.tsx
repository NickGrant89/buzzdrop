import Link from "next/link";
import type { ReactNode } from "react";
import { StoreLayout } from "@/components/StoreLayout";

type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <StoreLayout>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          ← Back to shop
        </Link>

        <header className="mt-6 border-b border-zinc-800 pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
          <p className="mt-4 text-xs text-zinc-600">Last updated: 8 June 2026</p>
        </header>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-400">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          <p className="font-medium text-zinc-300">Questions?</p>
          <p className="mt-2">
            Email us at{" "}
            <a
              href="mailto:support@buzzdrop.co.uk"
              className="text-violet-400 hover:text-violet-300"
            >
              support@buzzdrop.co.uk
            </a>
          </p>
          <p className="mt-4 text-xs text-zinc-600">
            See also:{" "}
            <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/returns" className="text-zinc-500 hover:text-zinc-300">
              Returns &amp; Refunds
            </Link>
          </p>
        </footer>
      </article>
    </StoreLayout>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
