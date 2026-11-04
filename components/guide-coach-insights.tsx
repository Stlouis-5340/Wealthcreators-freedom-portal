import { writeAudit } from "@/lib/audit";
import {
  COACH_DISCLAIMER,
  formatCoachStamp,
  grantAllowsCoachInsight,
  presentCoachInsight,
} from "@/lib/coach-plan";
import { loadMemberCoach } from "@/lib/coach-store";
import { activeGuideAccess } from "@/lib/grants";
import { chicagoMonthKey, formatMonthLabel } from "@/lib/month";
import { requireGuide } from "@/lib/permissions";

/** Assigned Guides see the monthly plan when the member has shared goals. The chat stays private. */
export async function GuideCoachInsights({ memberId }: { memberId: string }) {
  const guide = await requireGuide();
  if (!guide) return null;
  const access = await activeGuideAccess(guide.id, memberId);
  if (!access) return null;

  const monthKey = chicagoMonthKey();
  const shared = grantAllowsCoachInsight(access);
  const record = shared ? await loadMemberCoach(memberId, monthKey) : null;
  const insight = record?.plan ? presentCoachInsight(record.plan, access) : null;

  try {
    await writeAudit({
      actorUserId: guide.id,
      action: "guide.view_coach",
      targetType: "member",
      targetId: memberId,
      meta: { monthKey, shared, hasPlan: Boolean(insight) },
    });
  } catch {
    // The card still renders if the audit row cannot be written.
  }

  return (
    <section className="wc-card p-5 sm:p-6">
      <p className="wc-eyebrow">Freedom Coach</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">This month&apos;s action plan</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        The plan is educational. The member&apos;s chat with the coach stays on their side. This
        view has no bank names, account numbers, or connection tokens. {COACH_DISCLAIMER}
      </p>
      {!shared ? (
        <p className="mt-4 text-sm leading-6 text-ink">
          Goals are not shared, so the Freedom Action Plan stays private.
        </p>
      ) : insight ? (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-muted">
            {formatMonthLabel(monthKey)}
            {insight.regeneratedAt
              ? ` · Refreshed ${formatCoachStamp(insight.regeneratedAt)}`
              : ` · Saved ${formatCoachStamp(insight.generatedAt)}`}
            {insight.numbersShared ? "" : " · Dollar amounts and scores are hidden."}
          </p>
          <ol className="space-y-3">
            {insight.actions.map((action, index) => (
              <li key={`${action.title}-${index}`} className="rounded-2xl border border-line bg-background p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-medium text-ink">
                    <span className="mr-2 text-gold">{index + 1}</span>
                    {action.title}
                  </h3>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold-muted">
                    {action.difficulty} · {action.timeline}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink">{action.detail}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  <span className="font-medium text-ink">Impact. </span>
                  {action.impact}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  <span className="font-medium text-ink">Goal. </span>
                  {action.goalLink}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink">
          No Freedom Action Plan is saved for {formatMonthLabel(monthKey)}.
        </p>
      )}
    </section>
  );
}
