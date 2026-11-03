"use client";

import Link from "next/link";
import { chicagoMonthKey, formatMonthName } from "@/lib/month";

export function ReportCard() {
  const month = formatMonthName(chicagoMonthKey());
  return (
    <article className="wc-card border-gold/40 p-5 sm:p-6">
      <p className="wc-eyebrow">Monthly report</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Your {month} Freedom Report</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Where you stand this month: Freedom Score, the gap, yield, goals, and three educational
        next steps. Earlier months stay saved, so a change is a real comparison.
      </p>
      <Link href="/report" className="wc-btn wc-btn-primary mt-4">
        Open the report
      </Link>
    </article>
  );
}
