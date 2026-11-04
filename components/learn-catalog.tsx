import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EDUCATION_DISCLAIMER, levelLabel, statusLabel } from "@/lib/education";
import type { PathCard } from "@/lib/education-store";

export function LearnCatalog({ paths }: { paths: PathCard[] }) {
  const lessons = paths.flatMap((path) => path.lessons);
  const completed = lessons.filter((lesson) => lesson.status === "completed").length;
  const inProgress = lessons.filter((lesson) => lesson.status === "inProgress").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Grow"
        title="Learn"
        lede="Short lessons on the Freedom Score, passive income, and working with your Wealth Guide. They explain the portal. They do not tell you what to buy."
      />
      <p className="max-w-3xl rounded-2xl border border-gold/40 bg-surface px-4 py-3 text-sm leading-6 text-muted">
        {EDUCATION_DISCLAIMER}
      </p>
      <p className="text-sm text-ink">
        {completed} of {lessons.length} lessons finished
        {inProgress > 0 ? ` · ${inProgress} in progress` : ""}
      </p>
      {paths.map((path) => (
        <section key={path.id} className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{path.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{path.summary}</p>
          </div>
          <ul className="space-y-3">
            {path.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/learn/${lesson.id}`} className="wc-card block p-5 hover:border-gold-muted">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-gold-muted">
                    <span>{levelLabel(lesson.level)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{lesson.minutes} min</span>
                    <span aria-hidden="true">·</span>
                    <span>{statusLabel(lesson.status)}</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-ink">{lesson.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{lesson.summary}</p>
                  <p className="mt-3 text-xs text-muted">
                    {lesson.hasQuiz ? "Includes a short quiz" : "No quiz"}
                    {lesson.hasExercise ? " · Action exercise" : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
