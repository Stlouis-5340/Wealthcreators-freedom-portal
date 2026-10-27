"use client";

import { GoalCard } from "@/components/goal-card";
import { PageHeader } from "@/components/page-header";
import { usePortal } from "@/components/portal-provider";
import { GUIDE } from "@/lib/sample-data";

export function GoalsView() {
  const { roster, toggleStep, viewer } = usePortal();
  const alex = roster.find((member) => member.id === viewer.id);
  const goals = alex?.goals ?? [];
  const wealth = goals.filter((goal) => goal.kind === "wealth");
  const personal = goals.filter((goal) => goal.kind === "personal");
  const freedom = goals.find((goal) => goal.progressSource === "freedom");
  const netWorth = goals.find((goal) => goal.progressSource === "netWorth");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Goals"
        title="Six years, then this year"
        lede={`Wealth goals and personal goals sit on the same plan. ${GUIDE.name} can see progress. Bank credentials stay off this page.`}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Freedom goal" value={freedom ? `${Math.round(freedom.progress)}%` : "—"} detail="Along the path to 110%" />
        <Stat label="Net worth goal" value={netWorth ? `${Math.round(netWorth.progress)}%` : "—"} detail="Along the path to $1.5M" />
        <Stat
          label="This year"
          value={alex ? `${alex.stepsDone}/${alex.stepsTotal}` : "—"}
          detail="Steps you can finish in 2026"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Wealth</h2>
        {wealth.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onToggle={toggleStep} />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Personal</h2>
        {personal.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onToggle={toggleStep} />
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="wc-card px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}
