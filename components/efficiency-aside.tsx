import Link from "next/link";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import type { Metrics } from "@/lib/types";

/** Sits beside yield on assets. It does not replace that figure or Freedom Score. */
export function EfficiencyAside({ metrics }: { metrics: Metrics }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Income-producing yield</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {formatPercentOrDash(metrics.yieldOnIncomeAssets, 2)}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {formatMoney(metrics.annualPassive)} a year ÷ {formatMoney(metrics.incomeProducingAssets)} marked
            income-producing.
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Wealth Efficiency</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {formatPercentOrDash(metrics.yieldOnNetWorth, 2)}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Annual passive ÷ net worth. Secondary, because debt can make this look higher.
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        The large yield above still divides by everything you own. These two do not change Freedom Score.
        An assumed return is not used here, and nothing here is guaranteed.
      </p>
      <Link href="/efficiency" className="mt-3 inline-block text-sm text-gold-muted hover:text-gold">
        See productive and non-productive capital
      </Link>
    </div>
  );
}
