"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GoalCard } from "@/components/goal-card";
import { GuideMemberTools } from "@/components/guide-member-tools";
import { IntegrityBadge } from "@/components/integrity-badge";
import { usePortal } from "@/components/portal-provider";
import { QualityPanel } from "@/components/quality-panel";
import { StatusPills } from "@/components/status-pill";
import { formatDate, formatMoney, formatPercentOrDash, relativeDay } from "@/lib/format";
import type { DataIntegrity } from "@/lib/integrity";

export function MemberView({
  memberId,
  children,
}: {
  memberId: string;
  children?: ReactNode;
}) {
  const { memberById } = usePortal();
  const member = memberById(memberId);

  if (!member) {
    return (
      <section className="wc-card max-w-xl p-6">
        <h1 className="text-2xl font-semibold">Member not on this roster</h1>
        <Link href="/guide" className="mt-4 inline-block text-sm text-gold-muted hover:text-gold">
          Back to command center
        </Link>
      </section>
    );
  }

  const access = member.access;
  const wealth = access.goals ? member.goals.filter((goal) => goal.kind === "wealth") : [];
  const personal = access.goals ? member.goals.filter((goal) => goal.kind === "personal") : [];
  const covered = access.totals && member.metrics.monthlySurplus >= 0;
  const money = (on: boolean, value: number) => (on && Number.isFinite(value) ? formatMoney(value) : "Not shared");

  return (
    <div className="space-y-8">
      <div>
        <Link href="/guide" className="text-sm text-gold-muted hover:text-gold">
          Back to command center
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="wc-eyebrow">Member progress</p>
            <div className="wc-rule" />
            <h1 className="mt-4 text-4xl sm:text-5xl">{member.name}</h1>
            <p className="mt-2 text-sm text-muted">
              Last active {formatDate(member.lastActive)} · {relativeDay(member.lastActive)}
            </p>
          </div>
          <StatusPills statuses={member.statuses} />
        </div>
      </div>

      <p className="rounded-2xl border border-gold-muted/40 bg-surface px-4 py-3 text-sm leading-6 text-muted">
        You see the parts this member has shared: score, totals, goals, and check-ins.
        Category spending and transactions stay off. This view has no bank names, account
        numbers, or connection tokens.
      </p>

      <p className="max-w-3xl text-sm leading-6 text-ink">{member.coachingNote}</p>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Freedom Score"
          value={access.score ? formatPercentOrDash(member.metrics.freedomScore, 1) : "Not shared"}
          status={access.score ? member.integrity.freedomScore : undefined}
        />
        <Stat
          label="Freedom Gap"
          value={access.score ? formatMoney(member.metrics.monthlyFreedomGap) : "Not shared"}
          status={access.score ? member.integrity.freedomGap : undefined}
          detail={access.score ? "per month" : undefined}
        />
        <Stat
          label="Freedom Quality"
          value={
            access.score
              ? member.quality.score == null
                ? "—"
                : `${member.quality.score} / 100`
              : "Not shared"
          }
          detail={
            access.score ? `${Math.round(member.quality.confidence * 100)}% of the model had data` : undefined
          }
        />
        <Stat
          label="Yield on assets"
          value={access.totals ? formatPercentOrDash(member.metrics.yieldOnAssets, 2) : "Not shared"}
          status={access.totals ? member.integrity.yieldOnAssets : undefined}
          primary
        />
        <Stat
          label="Income-producing yield"
          value={access.totals ? formatPercentOrDash(member.metrics.yieldOnIncomeAssets, 2) : "Not shared"}
          detail={access.totals ? "Annual passive ÷ income-producing assets" : undefined}
        />
        <Stat
          label="Wealth Efficiency"
          value={access.totals ? formatPercentOrDash(member.metrics.yieldOnNetWorth, 2) : "Not shared"}
          detail={access.totals ? "Annual passive ÷ net worth. Secondary." : undefined}
        />
        <Stat
          label="Net worth"
          value={money(access.totals, member.metrics.netWorth)}
          status={access.totals ? member.integrity.netWorth : undefined}
        />
        <Stat
          label="6-year Freedom goal"
          value={access.goals && Number.isFinite(member.sixYearProgress) ? `${Math.round(member.sixYearProgress)}%` : "Not shared"}
        />
      </section>

      {children}

      <GuideMemberTools memberId={member.id} />

      {access.totals ? (
      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Passive income and the plan</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted">Passive / month</p>
              <IntegrityBadge status={member.integrity.passiveIncome} />
            </div>
            <p className="mt-1 text-2xl font-semibold">{formatMoney(member.metrics.monthlyPassive)}</p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted">Spending plan / month</p>
              <IntegrityBadge status={member.integrity.spendingPlan} />
            </div>
            <p className="mt-1 text-2xl font-semibold">{formatMoney(member.metrics.monthlyExpenses)}</p>
          </div>
          <div>
            <p className="text-sm text-muted">{covered ? "Surplus" : "Short of the plan"}</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatMoney(Math.abs(member.metrics.monthlySurplus))}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          Totals only. Yield on assets is {formatMoney(member.metrics.annualPassive)} a year divided
          by {formatMoney(member.metrics.totalAssets)} of assets.
          {access.score ? ` Freedom Gap is ${formatMoney(member.metrics.monthlyFreedomGap)} a month.` : ""}{" "}
          Labels say whether those totals are verified, estimated, stale, or missing. This view still
          has no bank names, category lines, or account numbers.
        </p>
      </section>
      ) : (
        <p className="wc-card px-5 py-6 text-sm leading-6 text-muted">
          Net worth, passive income, and the spending-plan total are not shared.
        </p>
      )}

      {access.score ? (
      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Freedom Quality</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">How durable the coverage looks</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Quality is separate from Freedom Score. Factors without enough plan detail are held out
          and called limited data. They are not filled in with a guess.
        </p>
        <div className="mt-4">
          <QualityPanel quality={member.quality} />
        </div>
      </section>
      ) : null}

      {access.goals ? (
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">
          Six-year goals
        </h2>
        {[...wealth, ...personal].map((goal) => (
          <GoalCard key={goal.id} goal={goal} readOnly />
        ))}
      </section>
      ) : (
        <p className="wc-card px-5 py-6 text-sm leading-6 text-muted">Six-year goals are not shared.</p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  primary = false,
  status,
  detail,
}: {
  label: string;
  value: string;
  primary?: boolean;
  status?: DataIntegrity;
  detail?: string;
}) {
  const shown = status === "missing" ? "—" : value;
  return (
    <div className="wc-card px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
        <span className="flex items-center gap-2">
          {primary ? (
            <span className="text-[10px] uppercase tracking-[0.12em] text-gold">Primary</span>
          ) : null}
          {status ? <IntegrityBadge status={status} /> : null}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{shown}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
