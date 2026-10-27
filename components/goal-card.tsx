import type { CheckpointStatus, ResolvedGoal } from "@/lib/types";

const statusCopy: Record<CheckpointStatus, string> = {
  complete: "Complete",
  current: "This year",
  upcoming: "Upcoming",
  ahead: "Ahead",
  missed: "Missed",
};

const statusClass: Record<CheckpointStatus, string> = {
  complete: "text-success",
  current: "text-gold",
  upcoming: "text-muted",
  ahead: "text-success",
  missed: "text-danger",
};

export function GoalCard({
  goal,
  onToggle,
  readOnly = false,
}: {
  goal: ResolvedGoal;
  onToggle?: (id: string) => void;
  readOnly?: boolean;
}) {
  const journey = goal.progressSource === "journey";

  return (
    <article className="wc-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="wc-eyebrow">{goal.kind === "wealth" ? "Wealth" : "Personal"}</p>
        {journey ? null : (
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Six-year goal</p>
        )}
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">{goal.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{goal.summary}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-ink">
            {journey ? `${goal.stepsDone} of ${goal.steps.length}` : `${Math.round(goal.progress)}%`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {journey ? "steps this year" : "of the six-year target"}
          </p>
        </div>
        <div>
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-ink">Now {goal.currentLabel}</span>
            <span className="text-muted">{goal.targetLabel}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">{goal.progressNote}</p>
        </div>
      </div>

      <ol className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {goal.checkpoints.map((checkpoint) => (
          <li
            key={checkpoint.year}
            className={`min-w-[128px] flex-1 rounded-xl border px-3 py-2 ${
              checkpoint.status === "current"
                ? "border-gold/70 bg-surface-raised"
                : "border-line"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
              Y{checkpoint.year} · {checkpoint.calendarYear}
            </p>
            <p className="mt-1 text-sm text-ink">{checkpoint.label}</p>
            <p className={`mt-2 text-xs font-medium ${statusClass[checkpoint.status]}`}>
              {statusCopy[checkpoint.status]}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-line pt-4">
        <p className="wc-eyebrow">This year</p>
        <ul className="mt-3 divide-y divide-line">
          {goal.steps.map((step) => (
            <li key={step.id} className="flex gap-3 py-3">
              {readOnly ? (
                <span
                  className={`mt-0.5 w-14 shrink-0 text-xs font-medium uppercase tracking-[0.12em] ${
                    step.done ? "text-success" : "text-muted"
                  }`}
                >
                  {step.done ? "Done" : "Open"}
                </span>
              ) : (
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0"
                  checked={step.done}
                  onChange={() => onToggle?.(step.id)}
                  aria-label={step.title}
                />
              )}
              <div>
                <p className={step.done ? "text-muted" : "text-ink"}>{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{step.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
