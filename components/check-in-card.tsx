"use client";

import Link from "next/link";
import { usePortal } from "@/components/portal-provider";
import { sortCheckIns } from "@/lib/check-in";
import { chicagoWeekKey, formatWeekSpan } from "@/lib/week";

export function CheckInCard() {
  const { roster, viewer } = usePortal();
  const mine = roster.find((member) => member.id === viewer.id);
  const weekKey = chicagoWeekKey();
  const current = sortCheckIns(mine?.checkIns ?? []).find((checkIn) => checkIn.weekKey === weekKey);

  if (current) {
    return (
      <article className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">This week</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Checked in</h2>
        <p className="mt-3 text-sm leading-6 text-ink">{current.summary}</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          You can update this until the week ends ({formatWeekSpan(weekKey)}, America/Chicago).
        </p>
        <Link href="/check-in" className="mt-4 inline-block text-sm text-gold-muted hover:text-gold">
          Update this week&apos;s check-in
        </Link>
      </article>
    );
  }

  return (
    <article className="wc-card p-5 sm:p-6">
      <p className="wc-eyebrow">This week</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Check in this week</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Five questions. Most people finish in under three minutes. Your Wealth Guide sees the
        reflection, not your banks or account numbers.
      </p>
      <Link href="/check-in" className="wc-btn wc-btn-primary mt-4">
        Check in this week
      </Link>
    </article>
  );
}
