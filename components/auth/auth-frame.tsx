import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";

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
    <div className="auth-stage flex min-h-screen flex-col lg:flex-row">
      <aside className="relative flex flex-col justify-between border-b border-gold/25 px-6 py-8 sm:px-10 lg:w-[46%] lg:border-r lg:border-b-0 lg:px-14 lg:py-12">
        <Link
          href="/login"
          className="block max-w-[280px] rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          <BrandLogo className="h-auto w-full" priority />
        </Link>
        <div className="mt-10 lg:mt-0">
          <BrandMark className="mb-6 h-24 w-auto lg:h-32" />
          <p className="wc-eyebrow">Freedom Portal</p>
          <p className="mt-4 max-w-md text-4xl leading-none text-ink sm:text-5xl">
            Legacy, protected.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
            A private membership room for Freedom Score, yield, and the plan you share with your Wealth Guide.
          </p>
          <div className="wc-rule" />
        </div>
        <p className="mt-10 text-[11px] font-medium tracking-[0.28em] text-gold uppercase">
          Wealth Creators
        </p>
      </aside>
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <section className="wc-card p-6 sm:p-8">
            <h1 className="text-4xl text-ink">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted">{lede}</p>
            <div className="mt-6">{children}</div>
          </section>
          <p className="mt-6 text-center text-sm text-muted">
            <Link
              href={alternateHref}
              className="text-gold underline-offset-4 hover:text-gold-bright hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {alternateLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
