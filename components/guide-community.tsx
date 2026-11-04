import { ProgressMeter } from "@/components/progress-meter";
import { writeAudit } from "@/lib/audit";
import { statusLabel } from "@/lib/challenges";
import { loadGuideChallenges, loadGuideRecognition } from "@/lib/community-store";
import { formatDate } from "@/lib/format";
import { requireGuide } from "@/lib/permissions";
import { formatChicagoDateTime } from "@/lib/week";

/** Read-only challenges and shared recognition. Private cards are not loaded. */
export async function GuideCommunity({ memberId }: { memberId: string }) {
  const guide = await requireGuide();
  if (!guide) return null;
  const [enrollments, achievements] = await Promise.all([
    loadGuideChallenges(guide.id, memberId),
    loadGuideRecognition(guide.id, memberId),
  ]);
  if (!enrollments || !achievements) return null;

  if (enrollments.length > 0) {
    try {
      await writeAudit({
        actorUserId: guide.id,
        action: "guide.view_challenges",
        targetType: "member",
        targetId: memberId,
        meta: { count: enrollments.length },
      });
    } catch {
      // The enrollments still render if the audit row cannot be written.
    }
  }
  if (achievements.length > 0) {
    try {
      await writeAudit({
        actorUserId: guide.id,
        action: "guide.view_recognition",
        targetType: "member",
        targetId: memberId,
        meta: { count: achievements.length },
      });
    } catch {
      // The cards still render if the audit row cannot be written.
    }
  }

  return (
    <>
      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Challenges</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Enrollments</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Read-only. You see status and progress for challenges this member’s access allows.
          Dollar amounts, account names, and connection tokens are not on these cards.
        </p>
        {enrollments.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No challenge enrollment is visible for this member.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {enrollments.map((card) => (
              <article key={card.id} className="rounded-2xl border border-line bg-background p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-medium text-ink">{card.title}</h3>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                    {statusLabel(card.status)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {card.durationDays} days · {card.progress}% · window ends {formatDate(card.endsOn)}
                </p>
                <ProgressMeter value={card.progress} />
                {card.groupName ? (
                  <p className="mt-3 text-sm text-ink">
                    {card.groupName}
                    {card.groupSize != null ? ` · ${card.groupSize} ${card.groupSize === 1 ? "person" : "people"}` : ""}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Recognition</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Shared with you</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Only cards this member marked shared, and only where their Guide access allows it.
          Private recognition is not loaded. Cards do not show balances, income, debt, or accounts.
        </p>
        {achievements.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nothing shared with you.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {achievements.map((card) => (
              <article key={card.key} className="rounded-2xl border border-gold/40 bg-background p-4">
                <h3 className="text-lg font-medium text-ink">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{card.detail}</p>
                <p className="mt-2 text-xs text-gold-muted">{formatChicagoDateTime(card.unlockedAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
