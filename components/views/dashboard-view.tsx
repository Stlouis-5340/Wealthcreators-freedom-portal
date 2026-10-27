"use client";

import Link from "next/link";
import { FreedomRing } from "@/components/freedom-ring";
import { usePortal } from "@/components/portal-provider";
import { StatusPills } from "@/components/status-pill";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import { passiveNeededFor } from "@/lib/metrics";
import { stageCopy, stageFor, stageTitle } from "@/lib/milestones";
import { GUIDE } from "@/lib/sample-data";

export function DashboardView() {
  const { metrics, roster, toggleStep, viewer } = usePortal();
  const alex = roster.find((member) => member.id === viewer.id);
  const stage = stageFor(metrics.freedomScore);
  const needed =
    stage.next && metrics.freedomScore != null
      ? passiveNeededFor(
          stage.next.threshold,
          metrics.monthlyExpenses,
          metrics.monthlyPassive,
        )
      : 0;
  const steps = alex?.goals.flatMap((goal) =>
    goal.steps.map((step) => ({ ...step, goal: goal.title })),
  ) ?? [];
  const ordered = [...steps.filter((step) => !step.done), ...steps.filter((step) => step.done)];
  const preview = ordered.slice(0, 5);
  const maxBar = Math.max(metrics.monthlyPassive, metrics.monthlyExpenses, 1);
  const covered = metrics.monthlySurplus >= 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wc-eyebrow">Member dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{viewer.name}</h1>
          <p className="mt-2 text-sm text-muted">
            Wealth Guide {GUIDE.name}. Passive income, measured against the spending plan.
          </p>
        </div>
        {alex ? <StatusPills statuses={alex.statuses} /> : null}
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="wc-card p-5 sm:p-6">
          <p className="wc-eyebrow">Freedom Score</p>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <FreedomRing score={metrics.freedomScore} />
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-lg leading-7 text-ink">
                {metrics.freedomScore == null
                  ? "Add a spending plan to calculate the score."
                  : covered
                    ? `Passive income covers the plan, with ${formatMoney(metrics.monthlySurplus)} left over each month.`
                    : `Passive income covers ${formatPercentOrDash(metrics.freedomScore, 1)} of the spending plan.`}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">
                {metrics.freedomScore == null
                  ? "The score is monthly passive income divided by the monthly plan."
                  : covered
                    ? "Above 100% is Freedom+. The extra is surplus, not a reason to ignore the plan."
                    : `${formatMoney(Math.abs(metrics.monthlySurplus))} more passive income each month reaches the line without cutting the plan.`}
              </p>
              <details className="mt-4 text-sm text-muted">
                <summary className="cursor-pointer text-gold-muted">How this is calculated</summary>
                <p className="mt-2 leading-6">
                  Freedom Score = monthly passive income ÷ monthly spending plan.
                  {" "}
                  {formatMoney(metrics.monthlyPassive)} ÷ {formatMoney(metrics.monthlyExpenses)} ={" "}
                  {formatPercentOrDash(metrics.freedomScore, 1)}. The score can pass 100%.
                </p>
              </details>
            </div>
          </div>
        </article>

        <article className="wc-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="wc-eyebrow">Yield on assets</p>
            <span className="rounded-full border border-gold/40 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
              Primary
            </span>
          </div>
          <p className="mt-4 text-5xl font-semibold tracking-tight text-ink">
            {formatPercentOrDash(metrics.yieldOnAssets, 2)}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Annual passive income divided by everything you own. This is the headline yield.
            Yield on net worth is tracked separately and is not the primary number.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-surface-raised px-3 py-3">
              <dt className="text-muted">Annual passive</dt>
              <dd className="mt-1 text-base text-ink">{formatMoney(metrics.annualPassive)}</dd>
            </div>
            <div className="rounded-xl bg-surface-raised px-3 py-3">
              <dt className="text-muted">Total assets</dt>
              <dd className="mt-1 text-base text-ink">{formatMoney(metrics.totalAssets)}</dd>
            </div>
          </dl>
          <details className="mt-4 text-sm text-muted">
            <summary className="cursor-pointer text-gold-muted">Yield on net worth</summary>
            <p className="mt-2 leading-6">
              {formatMoney(metrics.annualPassive)} ÷ {formatMoney(metrics.netWorth)} net worth ={" "}
              {formatPercentOrDash(metrics.yieldOnNetWorth, 2)}. Useful context. The portal leads
              with yield on assets because liabilities should not make the rate look higher.
            </p>
          </details>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Snapshot
          label="Net worth"
          value={formatMoney(metrics.netWorth)}
          detail={`${formatMoney(metrics.totalAssets)} assets − ${formatMoney(metrics.totalLiabilities)} liabilities`}
          href="/assets"
          hrefLabel="Open balance sheet"
        />
        <Snapshot
          label="Passive income"
          value={formatMoney(metrics.monthlyPassive)}
          detail="Per month, from tagged streams only"
          href="/assets"
          hrefLabel="Edit streams"
        />
        <Snapshot
          label="Spending plan"
          value={formatMoney(metrics.monthlyExpenses)}
          detail="Per month. This is the Freedom Score denominator."
          href="/spending"
          hrefLabel="Edit the plan"
        />
      </section>

      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Passive income against the plan</p>
        <div className="mt-4 space-y-4">
          <Meter
            label="Passive income"
            value={metrics.monthlyPassive}
            width={(metrics.monthlyPassive / maxBar) * 100}
            tone="bg-gold"
          />
          <Meter
            label="Spending plan"
            value={metrics.monthlyExpenses}
            width={(metrics.monthlyExpenses / maxBar) * 100}
            tone="bg-ink/80"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <article className="wc-card p-5 sm:p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <p className="wc-eyebrow">Milestones</p>
            <Link href="/milestones" className="text-sm text-gold-muted hover:text-gold">
              Education
            </Link>
          </div>
          <ol className="mt-5 grid grid-cols-5 gap-2">
            {[25, 50, 75, 100, 125].map((threshold) => {
              const reached = (metrics.freedomScore ?? 0) >= threshold;
              return (
                <li key={threshold} className="text-center">
                  <div
                    className={`mx-auto h-2.5 w-2.5 rounded-full ${reached ? "bg-gold" : "bg-line"}`}
                  />
                  <p className={`mt-2 text-xs ${reached ? "text-ink" : "text-muted"}`}>{threshold}%</p>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-sm leading-6 text-muted">
            Stage: {stageTitle(metrics.freedomScore)}.{" "}
            {stage.next
              ? needed > 0
                ? `About ${formatMoney(needed)} more passive income each month reaches ${stage.next.threshold}%.`
                : `The next band is ${stage.next.threshold}%.`
              : "Surplus is the work now: give it a job."}
          </p>
        </article>
        <article className="wc-card p-5 sm:p-6 lg:col-span-2">
          <p className="wc-eyebrow">For this stage</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{stageTitle(metrics.freedomScore)}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{stageCopy(metrics.freedomScore)}</p>
        </article>
      </section>

      <section className="wc-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="wc-eyebrow">This year</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Steps on the six-year goals</h2>
          </div>
          <p className="text-sm text-muted">
            {alex ? `${alex.stepsDone} of ${alex.stepsTotal} done` : ""}
          </p>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {preview.map((step) => (
            <li key={step.id} className="flex gap-3 py-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={step.done}
                onChange={() => toggleStep(step.id)}
                aria-label={step.title}
              />
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{step.goal}</p>
                <p className={step.done ? "text-muted" : "text-ink"}>{step.title}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/goals" className="mt-2 inline-block text-sm text-gold-muted hover:text-gold">
          Open the full six-year plan
        </Link>
      </section>
    </div>
  );
}

function Snapshot({
  label,
  value,
  detail,
  href,
  hrefLabel,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <article className="wc-card p-5">
      <p className="wc-eyebrow">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
      <Link href={href} className="mt-3 inline-block text-sm text-gold-muted hover:text-gold">
        {hrefLabel}
      </Link>
    </article>
  );
}

function Meter({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: number;
  width: number;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-muted">{formatMoney(value)} / month</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-raised">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, width)}%` }} />
      </div>
    </div>
  );
}
