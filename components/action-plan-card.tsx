"use client";

import { useActionState } from "react";
import { generateFreedomPlanAction, type PlanFormState } from "@/lib/coach-actions";
import { formatCoachStamp, planRefreshState, type FreedomActionPlanView } from "@/lib/coach-plan";

const initial: PlanFormState = { error: "", saved: false };

export function ActionPlanCard({
  plan,
  monthLabel,
  configured,
}: {
  plan: FreedomActionPlanView | null;
  monthLabel: string;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(generateFreedomPlanAction, initial);
  const refresh = planRefreshState(plan);
  const showRefresh = configured && refresh === "ready";
  const showGenerate = configured && refresh === "missing";

  return (
    <section className="wc-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="wc-eyebrow">Freedom Action Plan</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{monthLabel}</h2>
        </div>
        {plan ? (
          <p className="text-xs text-muted">
            {plan.regeneratedAt
              ? `Refreshed ${formatCoachStamp(plan.regeneratedAt)}`
              : `Saved ${formatCoachStamp(plan.generatedAt)}`}
            {plan.source === "seed" ? " · Sample plan" : ""}
          </p>
        ) : null}
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
        Three priorities for this month. Each one names the impact, how hard it is, when it fits,
        and which goal it serves.
      </p>

      {plan ? (
        <ol className="mt-5 space-y-4">
          {plan.actions.map((item, index) => (
            <li key={`${item.title}-${index}`} className="rounded-2xl border border-line bg-background p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-medium text-ink">
                  <span className="mr-2 text-gold">{index + 1}</span>
                  {item.title}
                </h3>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold-muted">
                  {item.difficulty} · {item.timeline}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink">{item.detail}</p>
              <dl className="mt-3 space-y-1 text-sm leading-6 text-muted">
                <div>
                  <dt className="inline font-medium text-ink">Impact. </dt>
                  <dd className="inline">{item.impact}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-ink">Goal. </dt>
                  <dd className="inline">{item.goalLink}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-line px-4 py-6 text-sm leading-6 text-muted">
          No Freedom Action Plan is saved for {monthLabel}.
          {configured
            ? " Write one from your current score, gap, goals, and check-ins."
            : " Plan generation stays off until the coach is connected. The page still opens."}
        </p>
      )}

      {refresh === "used" && plan?.regeneratedAt ? (
        <p className="mt-4 text-sm leading-6 text-muted">
          This month&apos;s plan was refreshed {formatCoachStamp(plan.regeneratedAt)}. The earlier
          version is kept with the row. A new month starts a new plan. The chat history stays.
        </p>
      ) : null}

      {showGenerate || showRefresh ? (
        <form action={action} className="mt-5">
          <input type="hidden" name="intent" value={showRefresh ? "regenerate" : "generate"} />
          <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
            {pending ? "Writing…" : showRefresh ? "Refresh this month's plan" : "Write this month's plan"}
          </button>
        </form>
      ) : null}

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.saved ? <p className="mt-3 text-sm text-success">Saved for {monthLabel}.</p> : null}
    </section>
  );
}
