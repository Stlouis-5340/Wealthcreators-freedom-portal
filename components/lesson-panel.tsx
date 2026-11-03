"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  completeLessonAction,
  setLessonExerciseAction,
  submitQuizAction,
} from "@/lib/education-actions";
import { EDUCATION_DISCLAIMER, levelLabel, statusLabel } from "@/lib/education";
import type { LessonDetail } from "@/lib/education-store";
import { formatChicagoDateTime } from "@/lib/week";

export function LessonPanel({ lesson }: { lesson: LessonDetail }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [quiz, setQuiz] = useState<{
    score: number;
    correct: number;
    total: number;
    results: boolean[];
  } | null>(
    lesson.latestQuiz
      ? { ...lesson.latestQuiz, results: [] }
      : null,
  );
  const [answers, setAnswers] = useState<number[]>(() => lesson.questions.map(() => -1));

  async function run(task: () => Promise<{ ok: boolean; message?: string }>) {
    setPending(true);
    setError("");
    const result = await task();
    setPending(false);
    if (!result.ok) {
      setError(result.message ?? "That could not be saved.");
      return;
    }
    router.refresh();
  }

  async function onQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (answers.some((answer) => answer < 0)) {
      setError("Choose an answer for each question.");
      return;
    }
    setPending(true);
    setError("");
    const result = await submitQuizAction(lesson.id, answers);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setQuiz({
      score: result.score,
      correct: result.correct,
      total: result.total,
      results: result.results,
    });
    router.refresh();
  }

  return (
    <article className="space-y-8">
      <div>
        <Link href="/learn" className="text-sm text-gold-muted hover:text-gold">
          All lessons
        </Link>
        <p className="wc-eyebrow mt-4">{lesson.pathTitle}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{lesson.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {levelLabel(lesson.level)} · {lesson.minutes} min · {statusLabel(lesson.status)}
          {lesson.completedAt ? ` · finished ${formatChicagoDateTime(lesson.completedAt)}` : ""}
        </p>
      </div>
      <p className="max-w-3xl rounded-2xl border border-gold/40 bg-surface px-4 py-3 text-sm leading-6 text-muted">
        {EDUCATION_DISCLAIMER}
      </p>
      <div className="max-w-3xl space-y-4">
        {lesson.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm leading-7 text-ink">
            {paragraph}
          </p>
        ))}
      </div>

      {lesson.status === "completed" ? (
        <p className="text-sm text-success">This lesson is marked complete.</p>
      ) : (
        <button
          type="button"
          className="wc-btn wc-btn-primary"
          disabled={pending}
          onClick={() => run(async () => completeLessonAction(lesson.id))}
        >
          {pending ? "Saving…" : "Mark lesson complete"}
        </button>
      )}

      {lesson.exercise ? (
        <section className="wc-card max-w-3xl space-y-3 p-5">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Action exercise</h2>
          <p className="text-sm leading-6 text-ink">{lesson.exercise}</p>
          <label className="flex items-start gap-3 text-sm leading-6 text-ink">
            <input
              type="checkbox"
              className="mt-1"
              checked={lesson.exerciseDone}
              disabled={pending}
              onChange={(event) =>
                run(async () => setLessonExerciseAction(lesson.id, event.target.checked))
              }
            />
            <span>I did this exercise. It does not change my plan, my goals, or my Freedom Score.</span>
          </label>
        </section>
      ) : null}

      {lesson.questions.length > 0 ? (
        <section className="max-w-3xl space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Quiz</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {lesson.questions.length} questions. Your Guide can see the score, not the answers you picked.
              {quiz ? ` Latest score: ${quiz.correct} of ${quiz.total} (${quiz.score}%).` : ""}
            </p>
          </div>
          <form onSubmit={onQuiz} className="space-y-4">
            {lesson.questions.map((question, index) => (
              <fieldset key={question.id} className="wc-card space-y-2 p-5">
                <legend className="text-sm font-medium leading-6 text-ink">
                  {index + 1}. {question.prompt}
                </legend>
                {quiz && quiz.results.length === lesson.questions.length ? (
                  <p className={`text-xs ${quiz.results[index] ? "text-success" : "text-warning"}`}>
                    {quiz.results[index] ? "Correct" : "Not this one"}
                  </p>
                ) : null}
                {question.choices.map((choice, choiceIndex) => (
                  <label key={`${question.id}-${choiceIndex}`} className="flex items-start gap-3 text-sm leading-6 text-ink">
                    <input
                      type="radio"
                      name={question.id}
                      className="mt-1"
                      checked={answers[index] === choiceIndex}
                      onChange={() =>
                        setAnswers((current) =>
                          current.map((value, answerIndex) => (answerIndex === index ? choiceIndex : value)),
                        )
                      }
                    />
                    <span>{choice}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
              {pending ? "Saving…" : quiz ? "Submit again" : "Submit quiz"}
            </button>
          </form>
        </section>
      ) : error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </article>
  );
}
