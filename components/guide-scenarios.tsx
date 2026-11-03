import { writeAudit } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { activeGuideAccess } from "@/lib/grants";
import { requireGuide } from "@/lib/permissions";
import { presentScenarioForGuide } from "@/lib/scenarios";
import { listSharedScenarios } from "@/lib/scenario-store";

/** Assigned Guides see scenarios the member marked shared. Private runs are not loaded. */
export async function GuideSharedScenarios({ memberId }: { memberId: string }) {
  const guide = await requireGuide();
  if (!guide) return null;
  const access = await activeGuideAccess(guide.id, memberId);
  if (!access) return null;
  const rows = await listSharedScenarios(memberId);
  const cards = rows.flatMap((row) => {
    const card = presentScenarioForGuide(row, access);
    return card ? [card] : [];
  });
  if (cards.length === 0) return null;
  try {
    await writeAudit({
      actorUserId: guide.id,
      action: "guide.view_scenarios",
      targetType: "member",
      targetId: memberId,
      meta: { count: cards.length },
    });
  } catch {
    // The scenarios still render if the audit row cannot be written.
  }

  return (
    <section className="wc-card p-5 sm:p-6">
      <p className="wc-eyebrow">Shared scenarios</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Illustrations this member shared</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        These are estimates the member saved, not assignments from you. Dates are not guarantees.
        This view has no bank names, account numbers, or connection tokens. A scenario they did not
        share does not appear here.
      </p>
      <div className="mt-5 space-y-4">
        {cards.map((card) => (
          <article key={card.id} className="rounded-2xl border border-line bg-background p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-medium text-ink">{card.name}</h3>
              <p className="text-xs uppercase tracking-[0.14em] text-gold-muted">{card.kindLabel}</p>
            </div>
            <p className="mt-1 text-xs text-muted">Updated {formatDate(card.updatedAt.slice(0, 10))}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{card.hiddenNote}</p>
            {card.statements.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-ink">
                {card.statements.map((statement) => (
                  <li key={statement}>{statement}</li>
                ))}
              </ul>
            ) : null}
            {card.ranges.length > 0 ? (
              <dl className="mt-4 space-y-3">
                {card.ranges.map((range) => (
                  <div key={range.threshold}>
                    <dt className="text-sm font-medium text-gold">{range.threshold} Freedom Score</dt>
                    <dd className="mt-1 text-sm leading-6 text-muted">{range.text}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
