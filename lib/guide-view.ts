import { writeAudit } from "@/lib/audit";
import { activeGuideAccess } from "@/lib/grants";
import { requireGuide } from "@/lib/permissions";

/** Log a Guide opening a member's financial summary. Skips quietly when the member is not assigned. */
export async function recordGuideSummaryView(memberId: string): Promise<void> {
  const guide = await requireGuide();
  if (!guide) return;
  const access = await activeGuideAccess(guide.id, memberId);
  if (!access) return;
  try {
    await writeAudit({
      actorUserId: guide.id,
      action: "guide.view_summary",
      targetType: "member",
      targetId: memberId,
      meta: {
        score: access.score,
        totals: access.totals,
        goals: access.goals,
        checkIns: access.checkIns,
        tasks: access.tasks,
      },
    });
  } catch {
    // The summary still opens if the audit row cannot be written.
  }
}
