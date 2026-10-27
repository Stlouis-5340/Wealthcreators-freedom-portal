import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

export function AuthFrame({
  title,
  lede,
  children,
  alternateHref,
  alternateLabel,
}: {
  title: string;
  lede: string;
  children: ReactNode;
  alternateHref: string;
  alternateLabel: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          <BrandLogo className="mx-auto h-auto w-full max-w-[280px]" priority />
        </Link>
        <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-gold-muted">
          Freedom Portal
        </p>
        <section className="wc-card mt-8 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{lede}</p>
          <div className="mt-6">{children}</div>
        </section>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href={alternateHref} className="text-gold hover:text-gold-bright">
            {alternateLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
