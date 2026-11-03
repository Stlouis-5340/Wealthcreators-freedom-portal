"use client";

import { useMemo, useState } from "react";
import { IntegrityBadge } from "@/components/integrity-badge";
import { PageHeader } from "@/components/page-header";
import { QualityPanel } from "@/components/quality-panel";
import { usePortal } from "@/components/portal-provider";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import {
  ILLUSTRATIVE_YIELD_MAX,
  ILLUSTRATIVE_YIELD_PERCENT,
  projectGap,
  type GapProjection,
} from "@/lib/gap";
import type { DataIntegrity } from "@/lib/integrity";

export function GapView() {
  const { metrics, roster, viewer, lineIntegrity } = usePortal();
  const member = roster.find((row) => row.id === viewer.id);
  const integrity = member?.integrity;
  const quality = member?.quality;
  const [expenseReduction, setExpenseReduction] = useState(0);
  const [addedPassive, setAddedPassive] = useState(0);
  const [addedAssets, setAddedAssets] = useState(0);
  const [assumedYieldPercent, setAssumedYieldPercent] = useState(ILLUSTRATIVE_YIELD_PERCENT);

  const base = useMemo(
    () => ({
      monthlyExpenses: metrics.monthlyExpenses,
      monthlyPassive: metrics.monthlyPassive,
    }),
    [metrics.monthlyExpenses, metrics.monthlyPassive],
  );

  const scenario = projectGap({
    ...base,
    expenseReduction,
    addedPassive,
    addedAssets,
    assumedYieldPercent,
  });
  const expensesOnly = projectGap({
    ...base,
    expenseReduction,
    addedPassive: 0,
    addedAssets: 0,
    assumedYieldPercent,
  });
  const incomeOnly = projectGap({
    ...base,
    expenseReduction: 0,
    addedPassive,
    addedAssets: 0,
    assumedYieldPercent,
  });
  const assetsOnly = projectGap({
    ...base,
    expenseReduction: 0,
    addedPassive: 0,
    addedAssets,
    assumedYieldPercent,
  });

  const gapClosed = metrics.monthlyFreedomGap - scenario.monthlyFreedomGap;
  const untouched =
    expenseReduction === 0 && addedPassive === 0 && addedAssets === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Freedom Gap"
        title="The distance from the spending plan to passive income"
        lede="Monthly Freedom Gap is the spending plan minus qualifying passive income, and it never goes below zero. Freedom Score stays passive income divided by that plan. Move the levers to see a combination. Nothing here is saved, and nothing here is a promise."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Figure
          label="Monthly Freedom Gap"
          value={moneyOrDash(metrics.monthlyFreedomGap, integrity?.freedomGap)}
          status={integrity?.freedomGap ?? "missing"}
          detail="max(0, spending plan − passive income)"
        />
        <Figure
          label="Freedom Score"
          value={formatPercentOrDash(metrics.freedomScore, 1)}
          status={integrity?.freedomScore ?? "missing"}
          detail="Passive income ÷ spending plan. It can pass 100%."
        />
        <Figure
          label="Freedom Quality"
          value={quality?.score == null ? "—" : `${quality.score} / 100`}
          detail={
            quality == null
              ? "Quality uses the plan already on file."
              : `${Math.round(quality.confidence * 100)}% of the quality model had data.`
          }
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Figure
          label="Spending plan"
          value={moneyOrDash(metrics.monthlyExpenses, integrity?.spendingPlan)}
          status={integrity?.spendingPlan ?? "missing"}
          detail="Per month. This is the denominator."
        />
        <Figure
          label="Qualifying passive income"
          value={moneyOrDash(metrics.monthlyPassive, integrity?.passiveIncome)}
          status={integrity?.passiveIncome ?? "missing"}
          detail="Per month, from tagged streams only."
        />
      </section>

      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Try a combination</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Three levers, one picture</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Cut the plan, add passive income you would actually tag, or test what an income-producing
          asset might add. The asset lever uses the yield you type. {ILLUSTRATIVE_YIELD_PERCENT}% a
          year is the starting illustration. It is not a forecast, and it is not guaranteed.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Lever
            id="expense-reduction"
            label="Reduce monthly expenses"
            hint="Dollars you would take out of the spending plan."
            value={expenseReduction}
            max={Math.max(metrics.monthlyExpenses, 0)}
            step={50}
            onChange={setExpenseReduction}
          />
          <Lever
            id="added-passive"
            label="Add monthly passive income"
            hint="A stream you would tag as qualifying passive income."
            value={addedPassive}
            max={Math.max(10000, Math.ceil(metrics.monthlyExpenses))}
            step={50}
            onChange={setAddedPassive}
          />
          <Lever
            id="added-assets"
            label="Add income-producing assets"
            hint="The balance you would put to work. Income below uses the assumed yield."
            value={addedAssets}
            max={2_000_000}
            step={5000}
            onChange={setAddedAssets}
          />
        </div>

        <div className="mt-6 max-w-md">
          <label htmlFor="assumed-yield" className="block text-sm font-medium text-ink">
            Assumed annual yield
          </label>
          <p className="mt-1 text-xs leading-5 text-muted">
            Illustrative only. Default {ILLUSTRATIVE_YIELD_PERCENT}%. Returns are not guaranteed,
            and an investment can lose money.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="assumed-yield"
              className="w-full accent-gold"
              type="range"
              min={0}
              max={ILLUSTRATIVE_YIELD_MAX}
              step={0.5}
              value={assumedYieldPercent}
              onChange={(event) => setAssumedYieldPercent(Number(event.target.value))}
            />
            <input
              className="wc-input w-24 text-right"
              type="number"
              min={0}
              max={ILLUSTRATIVE_YIELD_MAX}
              step={0.5}
              aria-label="Assumed annual yield percent"
              value={assumedYieldPercent}
              onChange={(event) => {
                const next = event.target.value === "" ? 0 : Number(event.target.value);
                setAssumedYieldPercent(Number.isFinite(next) ? next : 0);
              }}
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            At {assumedYieldPercent}% a year, {formatMoney(addedAssets)} would be illustrated as{" "}
            {formatMoney(scenario.monthlyFromAssets)} a month. That illustration is not income you
            have, and it is not a promised return.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-ink">
            {untouched
              ? "The scenario matches the plan on file."
              : gapClosed > 0
                ? `This scenario closes ${formatMoney(gapClosed)} of the monthly gap.`
                : "This scenario does not close any more of the gap."}
            {scoreSentence(metrics.freedomScore, scenario.freedomScore)}
          </p>
          <button
            type="button"
            className="wc-btn wc-btn-ghost"
            onClick={() => {
              setExpenseReduction(0);
              setAddedPassive(0);
              setAddedAssets(0);
              setAssumedYieldPercent(ILLUSTRATIVE_YIELD_PERCENT);
            }}
          >
            Clear scenario
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ScenarioStat label="Scenario gap" projection={scenario} field="gap" />
          <ScenarioStat label="Scenario Freedom Score" projection={scenario} field="score" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <LeverResult title="Expense reduction alone" projection={expensesOnly} />
        <LeverResult title="Added passive income alone" projection={incomeOnly} />
        <LeverResult title="Added assets alone" projection={assetsOnly} />
      </section>

      <section className="rounded-2xl border border-gold-muted/40 bg-surface px-4 py-4 text-sm leading-6 text-muted">
        <p className="font-medium text-ink">Educational only. Not investment advice.</p>
        <p className="mt-2">
          This analyzer does not recommend a purchase, a sale, or a yield. The {ILLUSTRATIVE_YIELD_PERCENT}%
          starting point, and any yield you type, is an assumption for the picture. Returns are not
          guaranteed. Talk with your Wealth Guide and a qualified professional before you act.
        </p>
      </section>

      <section id="quality" className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Freedom Quality</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Coverage is not the same as durability</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Freedom Score can look strong when one fragile source covers the plan. Quality is a
          separate 100-point reading of the plan you already have. Factors without enough detail
          are marked limited data and left out of the score.
        </p>
        <div className="mt-5">
          {quality ? <QualityPanel quality={quality} /> : <p className="text-sm text-muted">Quality is not available.</p>}
        </div>
      </section>

      <p className="text-xs leading-5 text-muted">
        Stream and expense labels on this page follow the plan you typed. Asset labels use the
        verified flag, the confirmation date, or the connected refresh.{" "}
        {Object.keys(lineIntegrity).length === 0 ? "" : "Open Net Worth to mark a manual balance verified."}
      </p>
    </div>
  );
}

function moneyOrDash(value: number, status: DataIntegrity | undefined): string {
  if (status === "missing") return "—";
  return formatMoney(value);
}

function scoreSentence(current: number | null, next: number | null): string {
  if (current == null && next == null) return " Freedom Score needs a spending plan above zero.";
  if (current == null || next == null) return " One of these scores needs a spending plan above zero.";
  const delta = next - current;
  if (Math.abs(delta) < 0.05) return ` Freedom Score stays ${formatPercentOrDash(current, 1)}.`;
  return ` Freedom Score moves from ${formatPercentOrDash(current, 1)} to ${formatPercentOrDash(next, 1)}.`;
}

function Figure({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string;
  detail: string;
  status?: DataIntegrity;
}) {
  return (
    <article className="wc-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="wc-eyebrow">{label}</p>
        {status ? <IntegrityBadge status={status} /> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

function Lever({
  id,
  label,
  hint,
  value,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const ceiling = Math.max(0, max);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <p className="mt-1 text-xs leading-5 text-muted">{hint}</p>
      <input
        id={id}
        className="mt-3 w-full accent-gold"
        type="range"
        min={0}
        max={ceiling}
        step={step}
        value={Math.min(value, ceiling)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <input
        className="wc-input mt-2 text-right"
        type="number"
        min={0}
        max={ceiling}
        step={step}
        aria-label={`${label} amount`}
        value={value}
        onChange={(event) => {
          const next = event.target.value === "" ? 0 : Number(event.target.value);
          onChange(Number.isFinite(next) ? Math.max(0, next) : 0);
        }}
      />
      <p className="mt-2 text-sm text-ink">{formatMoney(value)}</p>
    </div>
  );
}

function ScenarioStat({
  label,
  projection,
  field,
}: {
  label: string;
  projection: GapProjection;
  field: "gap" | "score";
}) {
  const value =
    field === "gap"
      ? formatMoney(projection.monthlyFreedomGap)
      : formatPercentOrDash(projection.freedomScore, 1);
  return (
    <div className="rounded-xl bg-surface-raised px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
    </div>
  );
}

function LeverResult({ title, projection }: { title: string; projection: GapProjection }) {
  return (
    <article className="wc-card p-5">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{formatMoney(projection.monthlyFreedomGap)}</p>
      <p className="mt-1 text-sm text-muted">Monthly gap</p>
      <p className="mt-3 text-sm text-ink">
        Freedom Score {formatPercentOrDash(projection.freedomScore, 1)}
      </p>
    </article>
  );
}
