"use server";

import { revalidatePath } from "next/cache";
import { completeLesson, setLessonExercise, submitLessonQuiz } from "@/lib/education-store";
import { requireMember } from "@/lib/permissions";

export type ActionResult = { ok: true } | { ok: false; message: string };

export type QuizActionResult =
  | { ok: true; score: number; correct: number; total: number; results: boolean[] }
  | { ok: false; message: string };

export async function completeLessonAction(lessonId: string): Promise<ActionResult> {
  const member = await requireMember();
  if (!member) return { ok: false, message: "Sign in as a member to mark a lesson complete." };
  const saved = await completeLesson(member.id, lessonId);
  if (!saved) return { ok: false, message: "That lesson is not in the catalog." };
  revalidateLearn(lessonId);
  return { ok: true };
}

export async function setLessonExerciseAction(lessonId: string, done: boolean): Promise<ActionResult> {
  const member = await requireMember();
  if (!member) return { ok: false, message: "Sign in as a member to check the exercise." };
  const saved = await setLessonExercise(member.id, lessonId, done);
  if (!saved) return { ok: false, message: "This lesson does not have an exercise." };
  revalidateLearn(lessonId);
  return { ok: true };
}

export async function submitQuizAction(lessonId: string, answers: number[]): Promise<QuizActionResult> {
  const member = await requireMember();
  if (!member) return { ok: false, message: "Sign in as a member to take the quiz." };
  const scored = await submitLessonQuiz(member.id, lessonId, answers);
  if (!scored) return { ok: false, message: "Answer every question, then try again." };
  revalidateLearn(lessonId);
  return {
    ok: true,
    score: scored.score,
    correct: scored.correct,
    total: scored.total,
    results: scored.results,
  };
}

function revalidateLearn(lessonId: string) {
  revalidatePath("/learn");
  revalidatePath(`/learn/${lessonId}`);
  revalidatePath("/report");
}
