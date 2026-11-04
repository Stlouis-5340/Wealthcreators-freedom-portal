import { levelLabel, statusLabel } from "@/lib/education";
import { guideLessonsFor } from "@/lib/education-store";
import { requireGuide } from "@/lib/permissions";
import { formatChicagoDateTime } from "@/lib/week";

export async function GuideLearningPanel({ memberId }: { memberId: string }) {
  const guide = await requireGuide();
  if (!guide) return null;
  const view = await guideLessonsFor(guide.id, memberId);
  if (!view) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Learning</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Lesson titles and quiz scores only. Answers stay with the member. This is study progress, not a change in the Freedom Score.
        </p>
      </div>
      {view.shared ? (
        <ul className="space-y-3">
          {view.lessons.map((lesson) => (
            <li key={lesson.id} className="wc-card p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                {lesson.pathTitle} · {levelLabel(lesson.level)} · {lesson.minutes} min
              </p>
              <p className="mt-2 text-sm font-medium text-ink">{lesson.title}</p>
              <p className="mt-1 text-sm text-muted">
                {statusLabel(lesson.status)}
                {lesson.completedAt ? ` · ${formatChicagoDateTime(lesson.completedAt)}` : ""}
                {lesson.quizScore == null
                  ? ""
                  : ` · quiz ${lesson.quizCorrect} of ${lesson.quizTotal} (${lesson.quizScore}%)`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="wc-card px-5 py-6 text-sm leading-6 text-muted">Learning progress is not shared.</p>
      )}
    </section>
  );
}
