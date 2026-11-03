"use client";

import { PageHeader } from "@/components/page-header";
import { usePortal } from "@/components/portal-provider";
import { analyzeEfficiency, ROLE_LABEL, type CapitalRole } from "@/lib/efficiency";
import { formatMoney, formatPercent, formatPercentOrDash } from "@/lib/format";

const roles: CapitalRole[] = ["income", "appreciation", "lifestyle"];

export function EfficiencyView() {
  const { assets, streams, liabilities, metrics, setCapitalRole } = usePortal();
  const analysis = analyzeEfficiency({
    annualPassive: metrics.annualPassive,
    netWorth: metrics.netWorth,
    totalAssets: metrics.totalAssets,
    assets,
  });
  const productiveShare =
    metrics.totalAssets > 0 ? (analysis.incomeProducingValue / metrics.totalAssets) * 100 : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Wealth Efficiency"
        title="How hard your capital is working"
        lede="The primary number is annual qualifying passive income divided by income-producing assets. Wealth Efficiency divides that same income by net worth, and it stays secondary. This is cash-flow yield, not total return, and it is not a guaranteed rate."
      />

      <p className="rounded-2xl border border-gold-muted/40 bg-surface px-4 py-3 text-sm leading-6 text-muted">
        Educational coaching, not investment advice. Appreciation is not added. Selling principal is not
        income. Freedom Score is unchanged: it is still monthly passive income divided by the spending plan.
      </p>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="wc-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="wc-eyebrow">Income-producing yield</p>
            <span className="rounded-full border border-gold/40 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
              Primary
            </span>
          </div>
          <p className="mt-3 text-5xl font-semibold tracking-tight">
            {formatPercentOrDash(analysis.primaryYield, 2)}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {formatMoney(analysis.annualPassive)} a year ÷ {formatMoney(analysis.incomeProducingValue)} of
            income-producing holdings.
          </p>
        </article>
        <article className="wc-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="wc-eyebrow">Wealth Efficiency</p>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted">Secondary</span>
          </div>
          <p className="mt-3 text-5xl font-semibold tracking-tight">
            {formatPercentOrDash(analysis.wealthEfficiency, 2)}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {formatMoney(analysis.annualPassive)} a year ÷ {formatMoney(metrics.netWorth)} net worth.
            Liabilities shrink this base.
          </p>
        </article>
        <article className="wc-card p-5 sm:p-6">
          <p className="wc-eyebrow">Yield on all assets</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight">
            {formatPercentOrDash(metrics.yieldOnAssets, 2)}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            The figure already on Home and Net Worth. It divides by everything you own, including capital
            that is not paying qualifying income.
          </p>
        </article>
      </section>

      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Capital</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Productive and everything else</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Income-producing capital is the only balance in the primary yield. Appreciating or deferred
          capital, such as a retirement account, can still be building wealth. It is outside this cash-flow
          yield until it pays qualifying passive income. Lifestyle capital, such as a primary home, is part
          of net worth and is not treated as a paycheck.
        </p>
        <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-surface-raised">
          <div className="bg-gold" style={{ width: `${Math.min(100, productiveShare)}%` }} />
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Split label="Income-producing" value={analysis.incomeProducingValue} note="In the primary yield" />
          <Split
            label="Appreciating or deferred"
            value={analysis.appreciationValue}
            note="Outside the primary yield"
          />
          <Split label="Lifestyle" value={analysis.lifestyleValue} note="Outside the primary yield" />
        </dl>
        <div className="mt-5 space-y-3 text-sm leading-6 text-ink">
          {analysis.largestIncome ? (
            <p>
              Your largest income-producing holding is {analysis.largestIncome.name} at{" "}
              {formatMoney(analysis.largestIncome.balance)}. That is{" "}
              {formatPercent(analysis.largestIncome.shareOfIncomeProducing ?? 0, 1)} of the capital in the
              primary yield. The share is of the balance, not of the income.
            </p>
          ) : (
            <p>No holding is marked income-producing, so the primary yield has nothing to divide by.</p>
          )}
          {analysis.largestNonProductive ? (
            <p>
              Your largest holding outside that yield is {analysis.largestNonProductive.name} at{" "}
              {formatMoney(analysis.largestNonProductive.balance)}, marked{" "}
              {ROLE_LABEL[analysis.largestNonProductive.role].toLowerCase()}. It still counts in net worth.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Holdings</h2>
        {analysis.holdings.length === 0 ? (
          <p className="wc-card px-5 py-6 text-sm text-muted">Add balances on Net Worth to see this split.</p>
        ) : (
          analysis.holdings.map((holding) => (
            <article key={holding.id} className="wc-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium">{holding.name}</h3>
                  <p className="mt-1 text-sm text-muted">{holding.group}</p>
                </div>
                <p className="text-2xl font-semibold">{formatMoney(holding.balance)}</p>
              </div>
              <label className="mt-4 block text-sm" htmlFor={`role-${holding.id}`}>
                Role in this yield
                <select
                  id={`role-${holding.id}`}
                  className="wc-input mt-1.5"
                  value={holding.role}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (next === "income" || next === "appreciation" || next === "lifestyle") {
                      setCapitalRole(holding.id, next);
                    }
                  }}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-3 text-sm leading-6 text-muted">
                {holding.assumed ? "Assumed. " : "You set this. "}
                {holding.reason}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink">
                {holding.shareOfAssets == null
                  ? "No total asset balance to compare."
                  : `${formatPercent(holding.shareOfAssets, 1)} of everything you own.`}
                {holding.shareOfIncomeProducing == null
                  ? " Not in the primary yield."
                  : ` ${formatPercent(holding.shareOfIncomeProducing, 1)} of income-producing capital.`}
              </p>
            </article>
          ))
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="wc-card p-5 sm:p-6">
          <p className="wc-eyebrow">Numerator</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Qualifying passive income</h2>
          <ul className="mt-4 divide-y divide-line">
            {streams.length === 0 ? (
              <li className="py-3 text-sm text-muted">No passive streams are tagged yet.</li>
            ) : (
              streams.map((stream) => (
                <li key={stream.id} className="flex items-baseline justify-between gap-3 py-3 text-sm">
                  <span>
                    <span className="text-ink">{stream.name}</span>
                    <span className="mt-1 block text-muted">{stream.source}</span>
                  </span>
                  <span className="shrink-0 text-ink">{formatMoney(stream.monthly * 12)} / year</span>
                </li>
              ))
            )}
          </ul>
        </article>
        <article className="wc-card p-5 sm:p-6">
          <p className="wc-eyebrow">Debt</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Left out of the primary yield</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Liabilities are not subtracted inside the primary yield. They do lower net worth, which is why
            Wealth Efficiency can look higher than the yield on assets.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {liabilities.length === 0 ? (
              <li className="py-3 text-sm text-muted">No liabilities are on the plan.</li>
            ) : (
              liabilities.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 py-3 text-sm">
                  <span className="text-ink">{item.name}</span>
                  <span>{formatMoney(item.balance)}</span>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Assumptions</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
          {analysis.assumptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Split({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-xl bg-surface-raised px-3 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-medium text-ink">{formatMoney(value)}</dd>
      <dd className="mt-1 text-xs text-muted">{note}</dd>
    </div>
  );
}
