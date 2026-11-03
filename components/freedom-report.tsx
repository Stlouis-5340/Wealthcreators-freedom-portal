import Link from "next/link";
import { FreedomRing } from "@/components/freedom-ring";
import { ReportToolbar } from "@/components/report-toolbar";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import type { FreedomReportModel, MonthLink } from "@/lib/report-store";
import type { MetricDelta } from "@/lib/report";
import { formatChicagoDateTime } from "@/lib/week";

export function FreedomReport({
  model,
  variant = "page",
}: {
  model: FreedomReportModel;
  variant?: "page" | "section";
}) {
  const score = model.numbers.freedomScore;
  const coaching = model.coaching;
  const access = model.access;
  const shareActions = access.score && access.totals && access.goals;
  return (
    <article id="freedom-report" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="wc-eyebrow">{model.audience === "guide" ? "Coaching report" : "Freedom Report"}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {model.audience === "guide"
              ? `${model.memberName} · ${model.monthLabel}`
              : `Your ${model.monthName} Freedom Report`}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {model.audience === "member" ? `${model.memberName}. ` : ""}
            Saved {formatChicagoDateTime(model.generatedAt)}. America/Chicago month. This is a picture of
            the plan, not a forecast.
          </p>
        </div>
        <ReportToolbar sharePath={model.sharePath} isCurrent={model.isCurrent} audience={model.audience} />
      </header>

      <MonthNav months={model.months} current={model.monthKey} />

      <p className="rounded-2xl border border-gold/40 bg-surface px-4 py-3 text-sm leading-6">
        <span className="font-medium text-ink">{model.baseline.title}.</span>{" "}
        <span className="text-muted">{model.baseline.detail}</span>
      </p>

      {access.score ? (
      <section className="wc-card p-5 sm:p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <FreedomRing score={score} />
          <div className="min-w-0 text-center sm:text-left">
            <p className="wc-eyebrow">Freedom Score</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-ink">
              {formatPercentOrDash(score, 1)}
            </p>
            <DeltaLine delta={model.deltas.freedomScore} />
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Monthly passive income divided by the spending plan. The score can pass 100%. It does
              not say the income is diversified or durable. That question is Freedom Quality.
            </p>
          </div>
        </div>
      </section>
      ) : (
        <PrivateNote label="Freedom Score" />
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {access.totals ? (
          <MetricCard
            label="Net worth"
            value={moneyOrDash(model.numbers.netWorth)}
            hint="Assets minus liabilities"
            delta={model.deltas.netWorth}
          />
        ) : null}
        {access.totals ? (
          <MetricCard
            label="Passive income"
            value={model.numbers.passive == null ? "—" : `${formatMoney(model.numbers.passive)} / month`}
            hint="Qualifying streams only"
            delta={model.deltas.passive}
          />
        ) : null}
        {access.totals ? (
          <MetricCard
            label="Spending plan"
            value={model.numbers.expenses == null ? "—" : `${formatMoney(model.numbers.expenses)} / month`}
            hint="The total of the spending plan, not each category"
            delta={model.deltas.expenses}
          />
        ) : null}
        {access.score ? (
          <MetricCard
            label="Freedom Gap"
            value={model.numbers.gap == null ? "—" : `${formatMoney(model.numbers.gap)} / month`}
            hint="Plan minus qualifying passive income, never below zero"
            delta={model.deltas.gap}
          />
        ) : null}
        {access.totals ? (
          <MetricCard
            label="Yield on assets"
            value={formatPercentOrDash(model.numbers.yieldOnAssets, 2)}
            hint="Annual passive income divided by assets. Not total return."
            delta={model.deltas.yieldOnAssets}
            primary
          />
        ) : null}
        {access.score ? (
          <MetricCard
            label="Freedom Quality"
            value={model.numbers.quality == null ? "—" : `${Math.round(model.numbers.quality)} / 100`}
            hint="How durable the coverage looks. Separate from Freedom Score."
            delta={model.deltas.quality}
          />
        ) : null}
      </section>
      {!access.totals ? <PrivateNote label="Net worth, passive income, and the spending-plan total" /> : null}

      {coaching ? (
        <CoachingHighlights coaching={coaching} monthName={model.monthName} access={access} />
      ) : null}

      {access.goals ? (
      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Goals</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">Completion this month</h3>
        {model.goals.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-muted">No six-year goals are on the plan yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {model.goals.map((goal) => (
              <li key={goal.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{goal.title}</p>
                  <p className="text-xs text-muted">
                    {goal.kind === "personal" ? "Personal" : "Wealth"} · {goal.stepsDone} of {goal.stepsTotal}{" "}
                    steps · {goal.progress}%
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
                  />
                </div>
                {goal.steps.some((step) => !step.done) ? (
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Still open: {goal.steps.filter((step) => !step.done).slice(0, 2).map((step) => step.title).join("; ")}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-muted">This year&apos;s steps are complete.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : (
        <PrivateNote label="Six-year goals" />
      )}

      {access.score || access.goals ? (
      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Milestones</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">Achieved this month</h3>
        {model.milestones.trackable ? (
          <div className="mt-4 space-y-3">
            {model.milestones.bands.length === 0 && model.milestones.steps.length === 0 ? (
              <p className="text-sm leading-6 text-muted">{model.milestones.note}</p>
            ) : (
              <ul className="space-y-2">
                {model.milestones.bands.map((band) => (
                  <li key={band.threshold} className="text-sm leading-6 text-ink">
                    Freedom Score reached {band.threshold}% · {band.title}
                  </li>
                ))}
                {model.milestones.steps.map((step) => (
                  <li key={step.id} className="text-sm leading-6 text-ink">
                    Step completed: {step.title}
                    <span className="text-muted"> · {step.goalTitle}</span>
                  </li>
                ))}
              </ul>
            )}
            {model.milestones.note &&
            (model.milestones.bands.length > 0 || model.milestones.steps.length > 0) ? (
              <p className="text-sm leading-6 text-muted">{model.milestones.note}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted">{model.milestones.note}</p>
        )}
      </section>
      ) : (
        <PrivateNote label="Score and goal milestones" />
      )}

      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Education</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">Learning progress</h3>
        <p className="mt-3 text-sm leading-6 text-muted">{model.educationNote}</p>
      </section>

      {shareActions ? (
      <section className="space-y-4">
        <div>
          <p className="wc-eyebrow">Next actions</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">Three steps for this month</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{model.guidance}</p>
        </div>
        <ol className="grid gap-3 lg:grid-cols-3">
          {model.actions.map((item, index) => (
            <li key={item.id} className="wc-card flex flex-col p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
                {String(index + 1).padStart(2, "0")} · Educational
              </p>
              <h4 className="mt-3 text-base font-semibold leading-6 text-ink">{item.title}</h4>
              <p className="mt-3 text-sm leading-6 text-muted">{item.why}</p>
              <p className="mt-3 text-sm leading-6 text-ink">{item.impact}</p>
              <dl className="mt-4 space-y-1 text-xs leading-5 text-muted">
                <div className="flex justify-between gap-3">
                  <dt>Difficulty</dt>
                  <dd className="text-ink">{item.difficulty}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Timeline</dt>
                  <dd className="text-ink">{item.timeline}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Tied to</dt>
                  <dd className="text-right text-ink">{item.goalTie}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
        {model.actions.length === 0 ? (
          <p className="text-sm text-muted">The saved actions could not be read.</p>
        ) : null}
      </section>
      ) : (
        <PrivateNote label="This month's recommended actions" />
      )}

      {model.audience === "guide" ? (
        <p className="text-xs leading-5 text-muted">
          Plan totals, goals, and what the member wrote in a check-in. Bank names, account numbers,
          and connection tokens are not on this report.
          {variant === "page" ? (
            <>
              {" "}
              <Link href={`/guide/${model.memberId}`} className="text-gold-muted hover:text-gold">
                Back to {model.memberName}
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-xs leading-5 text-muted">
          Educational coaching for your plan. Not investment, tax, or legal advice. Returns are not
          promised.
        </p>
      )}
    </article>
  );
}

export function ReportMissing({
  memberName,
  monthLabel,
  months,
  audience,
}: {
  memberName: string;
  monthLabel: string;
  months: MonthLink[];
  audience: "member" | "guide";
}) {
  return (
    <section className="space-y-4">
      <p className="wc-eyebrow">{audience === "guide" ? "Coaching report" : "Freedom Report"}</p>
      <h2 className="text-3xl font-semibold tracking-tight">No report for {monthLabel}</h2>
      <p className="max-w-2xl text-sm leading-6 text-muted">
        {memberName} does not have a saved snapshot for that month. The portal does not fill a
        missing month with today&apos;s numbers.
      </p>
      {months.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {months.map((month) => (
            <Link key={month.monthKey} href={month.href} className="wc-btn wc-btn-ghost">
              {month.label}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No months have been saved yet.</p>
      )}
    </section>
  );
}

function MonthNav({ months, current }: { months: MonthLink[]; current: string }) {
  if (months.length === 0) return null;
  return (
    <nav className="no-print flex flex-wrap gap-2" aria-label="Saved months">
      {months.map((month) => {
        const active = month.monthKey === current;
        return (
          <Link
            key={month.monthKey}
            href={month.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              active
                ? "border-gold bg-surface-raised text-ink"
                : "border-line text-muted hover:border-gold-muted hover:text-ink"
            }`}
          >
            {month.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PrivateNote({ label }: { label: string }) {
  return (
    <p className="wc-card px-5 py-6 text-sm leading-6 text-muted">
      {label} is turned off for your Guide view. The member chooses this on Guide access. Category
      spending and transactions stay private either way.
    </p>
  );
}

function CoachingHighlights({
  coaching,
  monthName,
  access,
}: {
  coaching: NonNullable<FreedomReportModel["coaching"]>;
  monthName: string;
  access: FreedomReportModel["access"];
}) {
  const latest = coaching.latest;
  return (
    <section className="wc-card p-5 sm:p-6">
      <p className="wc-eyebrow">Coaching</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">Check-in and open follow-ups</h3>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-raised px-3 py-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">Open tasks</dt>
          <dd className="mt-1 text-2xl font-semibold text-ink">
            {access.tasks ? coaching.openTaskCount : "Not shared"}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-raised px-3 py-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">Coaching notes</dt>
          <dd className="mt-1 text-2xl font-semibold text-ink">{coaching.noteCount}</dd>
        </div>
      </dl>
      {access.checkIns && latest ? (
        <div className="mt-4">
          <p className="text-sm text-muted">
            Latest check-in · week of {latest.weekLabel}
            {latest.inThisMonth ? " · saved this month" : ` · not in ${monthName}`}
          </p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <Highlight label="Win" value={latest.win} />
            <Highlight label="Challenge" value={latest.challenge} />
            <Highlight label="Priority action" value={latest.actionStatus} />
            <Highlight label="Commitment" value={latest.commitment} />
            <Highlight label="Asked for support" value={latest.needsSupport ? "Yes" : "No"} />
            <Highlight label="Note" value={latest.supportNote.trim() || "None"} />
          </dl>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted">
          {access.checkIns ? "No check-in has been saved yet." : "Check-ins are not shared with you."}
        </p>
      )}
    </section>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 leading-6 text-ink">{value}</dd>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  delta,
  primary = false,
}: {
  label: string;
  value: string;
  hint: string;
  delta: MetricDelta;
  primary?: boolean;
}) {
  return (
    <article className="wc-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
        {primary ? <span className="text-[10px] uppercase tracking-[0.12em] text-gold">Primary</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <DeltaLine delta={delta} />
      <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>
    </article>
  );
}

function DeltaLine({ delta }: { delta: MetricDelta }) {
  const tone =
    delta.tone === "first"
      ? "text-gold-muted"
      : delta.favorable === true
        ? "text-success"
        : delta.favorable === false
          ? "text-warning"
          : "text-muted";
  return <p className={`mt-1 text-sm font-medium ${tone}`}>{delta.label}</p>;
}

function moneyOrDash(value: number | null): string {
  if (value == null) return "—";
  return formatMoney(value);
}
