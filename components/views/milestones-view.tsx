"use client";

import { PageHeader } from "@/components/page-header";
import { usePortal } from "@/components/portal-provider";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import { passiveNeededFor } from "@/lib/metrics";
import { bands, foundation, stageFor, stageTitle } from "@/lib/milestones";

export function MilestonesView() {
  const { metrics } = usePortal();
  const score = metrics.freedomScore;
  const stage = stageFor(score);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Education and milestones"
        title={stageTitle(score)}
        lede="Milestones are Freedom Score bands. They describe how much of the spending plan is covered. They are not a leaderboard."
      />

      <section className="wc-card p-5 sm:p-6">
        <p className="text-sm text-muted">Your score</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">
          {formatPercentOrDash(score, 1)}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {stage.unavailable
            ? "The score needs a spending plan above zero."
            : stage.foundation
              ? foundation.meaning
              : stage.current?.meaning}
          {stage.next
            ? ` Next band: ${stage.next.title} at ${stage.next.threshold}%.`
            : " You are in the top band. Surplus is the remaining decision."}
        </p>
      </section>

      {score != null && score < 25 ? (
        <BandCard
          thresholdLabel="Under 25%"
          title={foundation.title}
          meaning={foundation.meaning}
          education={foundation.education}
          state="current"
          gap={null}
        />
      ) : null}

      <ol className="space-y-4">
        {bands.map((band) => {
          const reached = score != null && score >= band.threshold;
          const current = stage.current?.threshold === band.threshold;
          const state = current ? "current" : reached ? "reached" : "ahead";
          const gap =
            !reached && score != null
              ? passiveNeededFor(band.threshold, metrics.monthlyExpenses, metrics.monthlyPassive)
              : null;
          return (
            <li key={band.threshold}>
              <BandCard
                thresholdLabel={`${band.threshold}%`}
                title={band.title}
                meaning={band.meaning}
                education={band.education}
                state={state}
                gap={gap}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function BandCard({
  thresholdLabel,
  title,
  meaning,
  education,
  state,
  gap,
}: {
  thresholdLabel: string;
  title: string;
  meaning: string;
  education: string;
  state: "current" | "reached" | "ahead";
  gap: number | null;
}) {
  const stateLabel =
    state === "current" ? "You are here" : state === "reached" ? "Reached" : "Ahead";
  const stateClass =
    state === "current"
      ? "text-gold"
      : state === "reached"
        ? "text-success"
        : "text-muted";

  return (
    <article className={`wc-card p-5 sm:p-6 ${state === "current" ? "border-gold/60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="wc-eyebrow">{thresholdLabel}</p>
        <p className={`text-xs font-medium uppercase tracking-[0.14em] ${stateClass}`}>{stateLabel}</p>
      </div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink">{meaning}</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{education}</p>
      {gap != null && gap > 0 ? (
        <p className="mt-4 text-sm text-gold-muted">
          About {formatMoney(gap)} more passive income each month reaches this band without cutting
          the plan.
        </p>
      ) : null}
    </article>
  );
}
