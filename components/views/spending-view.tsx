"use client";

import { MoneyField } from "@/components/money-field";
import { PageHeader } from "@/components/page-header";
import { usePortal } from "@/components/portal-provider";
import { formatMoney, formatPercentOrDash } from "@/lib/format";

export function SpendingView() {
  const { expenses, metrics, updateExpense } = usePortal();
  const covered = metrics.monthlySurplus >= 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Spending plan"
        title="The expense truth"
        lede="Freedom Score uses this plan as the denominator. It is the life you intend to fund, not raw card activity from a single month. Transfers, debt draws, and one-time principal events do not belong here."
      />

      <section className="wc-card grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        <div>
          <p className="wc-eyebrow">Plan total</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{formatMoney(metrics.monthlyExpenses)}</p>
          <p className="mt-1 text-sm text-muted">per month</p>
        </div>
        <div>
          <p className="wc-eyebrow">Freedom Score</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatPercentOrDash(metrics.freedomScore, 1)}
          </p>
          <p className="mt-1 text-sm text-muted">updates as you edit</p>
        </div>
        <div>
          <p className="wc-eyebrow">{covered ? "Monthly surplus" : "Gap to the line"}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatMoney(Math.abs(metrics.monthlySurplus))}
          </p>
          <p className="mt-1 text-sm text-muted">
            {covered
              ? "Passive income above the plan"
              : "More passive income, without cutting the plan"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {expenses.map((expense) => {
          const share =
            metrics.monthlyExpenses > 0
              ? (expense.monthly / metrics.monthlyExpenses) * 100
              : 0;
          return (
            <div key={expense.id} className="wc-card p-5">
              <MoneyField
                id={`expense-${expense.id}`}
                label={expense.name}
                hint={expense.note}
                value={expense.monthly}
                onChange={(monthly) => updateExpense(expense.id, monthly)}
              />
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                <div className="h-full rounded-full bg-gold/80" style={{ width: `${share}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">{share.toFixed(0)}% of the plan</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
