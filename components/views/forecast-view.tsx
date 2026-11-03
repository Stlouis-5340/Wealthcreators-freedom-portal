"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { usePortal } from "@/components/portal-provider";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import {
  buildForecast,
  buildWhatIf,
  DEFAULT_INFLATION_PERCENT,
  MILESTONES,
  WHAT_IFS,
  whenLabel,
  type ForecastBundle,
  type WhatIfId,
} from "@/lib/forecast";
import { ILLUSTRATIVE_YIELD_PERCENT } from "@/lib/gap";
import {
  deleteScenarioAction,
  saveScenarioAction,
  setScenarioShareAction,
} from "@/lib/scenario-actions";
import type { MemberScenarioSummary } from "@/lib/scenarios";

export function ForecastView({ saved }: { saved: MemberScenarioSummary[] }) {
  const router = useRouter();
  const { metrics } = usePortal();
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [expenseChange, setExpenseChange] = useState(0);
  const [assumedYieldPercent, setAssumedYieldPercent] = useState(ILLUSTRATIVE_YIELD_PERCENT);
  const [inflationPercent, setInflationPercent] = useState(DEFAULT_INFLATION_PERCENT);
  const [name, setName] = useState("");
  const [share, setShare] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const base = useMemo(
    () => ({
      monthlyPassive: metrics.monthlyPassive,
      monthlyExpenses: metrics.monthlyExpenses,
      monthlyContribution,
      expenseChange,
      addedMonthlyPassive: 0,
      assumedYieldPercent,
      inflationPercent,
    }),
    [
      metrics.monthlyPassive,
      metrics.monthlyExpenses,
      monthlyContribution,
      expenseChange,
      assumedYieldPercent,
      inflationPercent,
    ],
  );

  const forecast = useMemo(() => buildForecast(base), [base]);
  const whatIfs = useMemo(
    () => WHAT_IFS.map((preset) => ({ preset, bundle: buildWhatIf(base, preset.id) })),
    [base],
  );
  const current = forecast.scenarios.find((scenario) => scenario.id === "current");

  async function save(presetId: WhatIfId | null, fallbackName: string) {
    setPending(presetId ?? "forecast");
    setNotice("");
    const result = await saveScenarioAction({
      name: name || fallbackName,
      sharedWithGuide: share,
      monthlyContribution,
      expenseChange,
      assumedYieldPercent,
      inflationPercent,
      presetId,
    });
    setPending(null);
    setNotice(result.error || (share ? "Saved and shared with your Wealth Guide." : "Saved on your plan only."));
    if (!result.error) router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Forecast"
        title="When the Freedom Score bands might arrive"
        lede="Three illustrated paths run from the plan on file. Dates are ranges under the assumptions below, not a single promised day. This is educational coaching, not investment advice."
      />

      <p className="rounded-2xl border border-gold-muted/40 bg-surface px-4 py-3 text-sm leading-6 text-muted">
        Estimates, not guarantees. The assumed yield starts at {ILLUSTRATIVE_YIELD_PERCENT}% a year and
        applies only to new contributions. It is not a forecast of markets, rent, or your life, and it is
        not a guaranteed return. Freedom Score stays monthly passive income divided by the spending plan.
      </p>

      <section className="grid gap-4 sm:grid-cols-3">
        <Figure label="Freedom Score today" value={formatPercentOrDash(metrics.freedomScore, 1)} />
        <Figure label="Qualifying passive" value={`${formatMoney(metrics.monthlyPassive)} / month`} />
        <Figure label="Spending plan" value={`${formatMoney(metrics.monthlyExpenses)} / month`} />
      </section>

      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Current trajectory</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Numbers you can change</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          These four inputs are the current path. Conservative and accelerated shift them in ways the
          assumption list spells out. Nothing is saved until you choose Save.
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <MoneyInput
            id="monthly-contribution"
            label="Monthly contribution to income-producing assets"
            hint="New money only. Existing passive income stays flat."
            value={monthlyContribution}
            min={0}
            onChange={setMonthlyContribution}
          />
          <MoneyInput
            id="expense-change"
            label="Expense change"
            hint="Negative cuts the spending plan. Positive raises it. Applies immediately."
            value={expenseChange}
            min={-1_000_000}
            onChange={setExpenseChange}
          />
          <RateInput
            id="assumed-yield"
            label="Assumed yield on new contributions"
            hint={`Starts at ${ILLUSTRATIVE_YIELD_PERCENT}%. Illustration only. Not guaranteed.`}
            value={assumedYieldPercent}
            max={20}
            onChange={setAssumedYieldPercent}
          />
          <RateInput
            id="inflation"
            label="Inflation on the spending plan"
            hint="Annual rate. The plan is multiplied by (1 + rate) raised to months/12."
            value={inflationPercent}
            max={10}
            onChange={setInflationPercent}
          />
        </div>
      </section>

      <AssumptionList statements={forecast.statements} />

      <section className="grid gap-4 lg:grid-cols-3">
        {forecast.scenarios.map((scenario) => (
          <article key={scenario.id} className="wc-card p-5">
            <p className="wc-eyebrow">{scenario.label}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{scenario.summary}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Contribution" value={`${formatMoney(scenario.inputs.monthlyContribution)} / month`} />
              <Row label="Expense change" value={`${formatMoney(scenario.inputs.expenseChange)} / month`} />
              <Row label="Assumed yield" value={`${scenario.inputs.assumedYieldPercent.toFixed(1)}%`} />
              <Row label="Inflation" value={`${scenario.inputs.inflationPercent.toFixed(1)}%`} />
            </dl>
          </article>
        ))}
      </section>

      <MilestoneTable bundle={forecast} />

      {current ? (
        <section className="wc-card p-5 sm:p-6">
          <p className="wc-eyebrow">Along the current path</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Illustrated score, not a promise</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-2 pr-3 font-medium">Year</th>
                  <th className="py-2 pr-3 font-medium">Freedom Score</th>
                  <th className="py-2 pr-3 font-medium">Passive / month</th>
                  <th className="py-2 font-medium">Spending plan / month</th>
                </tr>
              </thead>
              <tbody>
                {current.checkpoints.map((point) => (
                  <tr key={point.year} className="border-t border-line">
                    <td className="py-2 pr-3 text-ink">{point.year === 0 ? "Today" : `Year ${point.year}`}</td>
                    <td className="py-2 pr-3">{formatPercentOrDash(point.score, 1)}</td>
                    <td className="py-2 pr-3">{formatMoney(point.passive)}</td>
                    <td className="py-2">{formatMoney(point.expenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <p className="wc-eyebrow">Decision simulator</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Three what-ifs</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Each preset uses the same engine as the paths above, on top of the numbers you typed. Compare
            the dates with the current trajectory. Saving one stores that comparison for you, and for your
            Guide only if you turn sharing on.
          </p>
        </div>
        {whatIfs.map(({ preset, bundle }) => (
          <article key={preset.id} className="wc-card p-5 sm:p-6">
            <h3 className="text-xl font-semibold tracking-tight">{preset.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{preset.detail}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className="py-2 pr-3 font-medium">Freedom Score</th>
                    <th className="py-2 pr-3 font-medium">Current trajectory</th>
                    <th className="py-2 font-medium">With this what-if</th>
                  </tr>
                </thead>
                <tbody>
                  {MILESTONES.map((threshold) => {
                    const before = bundle.scenarios[0]?.milestones.find((item) => item.threshold === threshold);
                    const after = bundle.scenarios[1]?.milestones.find((item) => item.threshold === threshold);
                    return (
                      <tr key={threshold} className="border-t border-line">
                        <td className="py-2 pr-3 text-ink">{threshold}%</td>
                        <td className="py-2 pr-3">{whenLabel(before?.monthIndex ?? null)}</td>
                        <td className="py-2">{whenLabel(after?.monthIndex ?? null)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="wc-btn wc-btn-ghost mt-4"
              disabled={pending !== null}
              onClick={() => void save(preset.id, preset.title)}
            >
              {pending === preset.id ? "Saving…" : "Save this what-if"}
            </button>
          </article>
        ))}
      </section>

      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Save</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Keep a run for later</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          The saved run uses the plan on file and the inputs on this page. It stays private until you share
          it. Your Guide never sees a run you leave unshared, and never sees bank names in a run.
        </p>
        <label className="mt-4 block text-sm" htmlFor="scenario-name">
          Name
          <input
            id="scenario-name"
            className="wc-input mt-1.5"
            maxLength={80}
            value={name}
            placeholder="Illustrated path"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="mt-4 flex items-start gap-3 text-sm leading-6" htmlFor="share-scenario">
          <input
            id="share-scenario"
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={share}
            onChange={(event) => setShare(event.target.checked)}
          />
          <span>
            <span className="text-ink">Share with my Wealth Guide</span>
            <span className="mt-1 block text-muted">
              Off by default. Your Guide still only sees the score and totals you already allow.
            </span>
          </span>
        </label>
        <button
          type="button"
          className="wc-btn wc-btn-primary mt-4"
          disabled={pending !== null}
          onClick={() => void save(null, "Illustrated path")}
        >
          {pending === "forecast" ? "Saving…" : "Save the three paths"}
        </button>
        {notice ? <p className="mt-3 text-sm text-ink">{notice}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Saved on your plan</h2>
        {saved.length === 0 ? (
          <p className="wc-card px-5 py-6 text-sm text-muted">No scenarios saved yet.</p>
        ) : (
          saved.map((scenario) => (
            <article key={scenario.id} className="wc-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-ink">{scenario.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {scenario.kind === "what-if" ? "What-if" : "Three paths"}
                  {" · "}
                  {scenario.sharedWithGuide ? "Shared with your Guide" : "Private"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="wc-btn wc-btn-ghost"
                  disabled={pending !== null}
                  onClick={() => {
                    setPending(scenario.id);
                    void setScenarioShareAction(scenario.id, !scenario.sharedWithGuide).then((result) => {
                      setPending(null);
                      setNotice(result.error || (scenario.sharedWithGuide ? "Hidden from your Guide." : "Shared with your Guide."));
                      if (!result.error) router.refresh();
                    });
                  }}
                >
                  {scenario.sharedWithGuide ? "Stop sharing" : "Share"}
                </button>
                <button
                  type="button"
                  className="wc-btn wc-btn-ghost"
                  disabled={pending !== null}
                  onClick={() => {
                    if (!window.confirm(`Delete “${scenario.name}”?`)) return;
                    setPending(scenario.id);
                    void deleteScenarioAction(scenario.id).then((result) => {
                      setPending(null);
                      setNotice(result.error || "Deleted.");
                      if (!result.error) router.refresh();
                    });
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function AssumptionList({ statements }: { statements: string[] }) {
  return (
    <section className="wc-card p-5 sm:p-6">
      <p className="wc-eyebrow">Every assumption</p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
        {statements.map((statement) => (
          <li key={statement}>{statement}</li>
        ))}
      </ul>
    </section>
  );
}

function MilestoneTable({ bundle }: { bundle: ForecastBundle }) {
  return (
    <section className="wc-card p-5 sm:p-6">
      <p className="wc-eyebrow">Milestones</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Illustrated ranges</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
        When more than one path reaches a band, the dates are a range. A blank path means that band is
        not reached within 40 years under those assumptions.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="py-2 pr-3 font-medium">Freedom Score</th>
              {bundle.scenarios.map((scenario) => (
                <th key={scenario.id} className="py-2 pr-3 font-medium">
                  {scenario.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bundle.ranges.map((range) => (
              <tr key={range.threshold} className="border-t border-line align-top">
                <td className="py-3 pr-3 text-ink">{range.threshold}%</td>
                {bundle.scenarios.map((scenario) => {
                  const hit = scenario.milestones.find((item) => item.threshold === range.threshold);
                  return (
                    <td key={scenario.id} className="py-3 pr-3 leading-6">
                      {whenLabel(hit?.monthIndex ?? null)}
                      {hit?.fallsBack ? (
                        <span className="mt-1 block text-xs text-muted">
                          Can fall back later if expenses outrun new income.
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <article className="wc-card p-5">
      <p className="wc-eyebrow">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function MoneyInput({
  id,
  label,
  hint,
  value,
  min,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="font-medium text-ink">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-muted">{hint}</span>
      <span className="mt-2 flex items-center rounded-xl border border-line bg-background px-3 focus-within:border-gold">
        <span className="text-sm text-muted" aria-hidden>
          $
        </span>
        <input
          id={id}
          className="w-full bg-transparent py-2 pl-2 text-right text-sm text-ink outline-none"
          inputMode="decimal"
          type="number"
          min={min}
          step={50}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => {
            const next = event.target.value === "" ? 0 : Number(event.target.value);
            onChange(Number.isFinite(next) ? next : 0);
          }}
        />
      </span>
    </label>
  );
}

function RateInput({
  id,
  label,
  hint,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="font-medium text-ink">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-muted">{hint}</span>
      <span className="mt-2 flex items-center rounded-xl border border-line bg-background px-3 focus-within:border-gold">
        <input
          id={id}
          className="w-full bg-transparent py-2 text-right text-sm text-ink outline-none"
          inputMode="decimal"
          type="number"
          min={0}
          max={max}
          step={0.1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => {
            const next = event.target.value === "" ? 0 : Number(event.target.value);
            onChange(Number.isFinite(next) ? next : 0);
          }}
        />
        <span className="pl-2 text-sm text-muted" aria-hidden>
          %
        </span>
      </span>
    </label>
  );
}
