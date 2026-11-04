import { activeGuideAccess } from "@/lib/grants";
import { guideAssigned } from "@/lib/activity-store";
import {
  describeEducationProgress,
  EDUCATION_PLACEHOLDER,
  isLessonLevel,
  isLessonStatus,
  parseChoices,
  scoreQuiz,
  type EducationProgressView,
  type GuideLessonRow,
  type LessonLevel,
  type LessonStatus,
  type QuizScore,
} from "@/lib/education";
import { prisma } from "@/lib/db";

export interface LessonCard {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  level: LessonLevel;
  status: LessonStatus;
  hasQuiz: boolean;
  hasExercise: boolean;
}

export interface PathCard {
  id: string;
  title: string;
  summary: string;
  lessons: LessonCard[];
}

export interface LessonDetail {
  id: string;
  pathTitle: string;
  title: string;
  summary: string;
  minutes: number;
  level: LessonLevel;
  paragraphs: string[];
  exercise: string;
  status: LessonStatus;
  completedAt: string | null;
  exerciseDone: boolean;
  questions: { id: string; prompt: string; choices: string[] }[];
  latestQuiz: { score: number; correct: number; total: number } | null;
}

export async function learningPathsFor(memberId: string): Promise<PathCard[]> {
  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({
      orderBy: { sort: "asc" },
      include: {
        path: { select: { id: true, title: true, summary: true, sort: true } },
        _count: { select: { questions: true } },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { memberId },
      select: { lessonId: true, status: true },
    }),
  ]);
  const statusByLesson = new Map(progress.map((row) => [row.lessonId, row.status]));
  const paths = new Map<string, PathCard>();
  const ordered = [...lessons].sort((a, b) => a.path.sort - b.path.sort || a.sort - b.sort);
  for (const lesson of ordered) {
    const level: LessonLevel = isLessonLevel(lesson.level) ? lesson.level : "beginner";
    const status: LessonStatus = isLessonStatus(statusByLesson.get(lesson.id) ?? "")
      ? (statusByLesson.get(lesson.id) as LessonStatus)
      : "notStarted";
    const card: LessonCard = {
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      minutes: lesson.minutes,
      level,
      status,
      hasQuiz: lesson._count.questions > 0,
      hasExercise: lesson.exercise.trim().length > 0,
    };
    const existing = paths.get(lesson.path.id);
    if (existing) existing.lessons.push(card);
    else {
      paths.set(lesson.path.id, {
        id: lesson.path.id,
        title: lesson.path.title,
        summary: lesson.path.summary,
        lessons: [card],
      });
    }
  }
  return [...paths.values()];
}

export async function educationSnapshot(memberId: string): Promise<EducationProgressView> {
  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({ select: { id: true, title: true }, orderBy: { sort: "asc" } }),
    prisma.lessonProgress.findMany({
      where: { memberId },
      select: { lessonId: true, status: true },
    }),
  ]);
  const statusByLesson = new Map(progress.map((row) => [row.lessonId, row.status]));
  const completedTitles = lessons
    .filter((lesson) => statusByLesson.get(lesson.id) === "completed")
    .map((lesson) => lesson.title);
  const inProgress = lessons.filter((lesson) => statusByLesson.get(lesson.id) === "inProgress").length;
  const counts = {
    total: lessons.length,
    completed: completedTitles.length,
    inProgress,
    completedTitles,
  };
  return {
    ...counts,
    note: counts.total === 0 ? EDUCATION_PLACEHOLDER : describeEducationProgress(counts),
    shared: true,
  };
}

export async function openLesson(memberId: string, lessonId: string): Promise<LessonDetail | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      path: { select: { title: true } },
      questions: { orderBy: { sort: "asc" } },
    },
  });
  if (!lesson || !isLessonLevel(lesson.level)) return null;
  const existing = await prisma.lessonProgress.findUnique({
    where: { memberId_lessonId: { memberId, lessonId } },
  });
  const progress =
    existing && existing.status !== "notStarted"
      ? existing
      : await prisma.lessonProgress.upsert({
          where: { memberId_lessonId: { memberId, lessonId } },
          create: { memberId, lessonId, status: "inProgress" },
          update: { status: "inProgress" },
        });
  const latest = await prisma.quizAttempt.findFirst({
    where: { memberId, lessonId },
    orderBy: { createdAt: "desc" },
  });
  const status: LessonStatus = isLessonStatus(progress.status) ? progress.status : "inProgress";
  return {
    id: lesson.id,
    pathTitle: lesson.path.title,
    title: lesson.title,
    summary: lesson.summary,
    minutes: lesson.minutes,
    level: lesson.level,
    paragraphs: lesson.body.split(/\n\n+/).map((part) => part.trim()).filter(Boolean),
    exercise: lesson.exercise.trim(),
    status,
    completedAt: progress.completedAt ? progress.completedAt.toISOString() : null,
    exerciseDone: progress.exerciseDone,
    questions: lesson.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      choices: parseChoices(question.choices),
    })),
    latestQuiz: latest
      ? { score: latest.score, correct: latest.correct, total: latest.total }
      : null,
  };
}

export async function completeLesson(memberId: string, lessonId: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) return false;
  const existing = await prisma.lessonProgress.findUnique({
    where: { memberId_lessonId: { memberId, lessonId } },
  });
  const completedAt = existing?.completedAt ?? new Date();
  await prisma.lessonProgress.upsert({
    where: { memberId_lessonId: { memberId, lessonId } },
    create: { memberId, lessonId, status: "completed", completedAt },
    update: { status: "completed", completedAt },
  });
  return true;
}

export async function setLessonExercise(memberId: string, lessonId: string, done: boolean): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { exercise: true },
  });
  if (!lesson || !lesson.exercise.trim()) return false;
  const existing = await prisma.lessonProgress.findUnique({
    where: { memberId_lessonId: { memberId, lessonId } },
  });
  await prisma.lessonProgress.upsert({
    where: { memberId_lessonId: { memberId, lessonId } },
    create: {
      memberId,
      lessonId,
      status: "inProgress",
      exerciseDone: done,
    },
    update: {
      exerciseDone: done,
      status: existing?.status === "completed" ? "completed" : "inProgress",
    },
  });
  return true;
}

export async function submitLessonQuiz(
  memberId: string,
  lessonId: string,
  answers: number[],
): Promise<QuizScore | null> {
  const questions = await prisma.quizQuestion.findMany({
    where: { lessonId },
    orderBy: { sort: "asc" },
  });
  if (questions.length === 0) return null;
  const scored = scoreQuiz(
    answers,
    questions.map((question) => ({
      answerIndex: question.answerIndex,
      choiceCount: parseChoices(question.choices).length,
    })),
  );
  if (!scored) return null;
  await prisma.quizAttempt.create({
    data: {
      memberId,
      lessonId,
      score: scored.score,
      correct: scored.correct,
      total: scored.total,
    },
  });
  const existing = await prisma.lessonProgress.findUnique({
    where: { memberId_lessonId: { memberId, lessonId } },
    select: { status: true },
  });
  await prisma.lessonProgress.upsert({
    where: { memberId_lessonId: { memberId, lessonId } },
    create: { memberId, lessonId, status: "inProgress" },
    update: { status: existing?.status === "completed" ? "completed" : "inProgress" },
  });
  return scored;
}

export async function guideLessonsFor(
  guideId: string,
  memberId: string,
): Promise<{ shared: boolean; lessons: GuideLessonRow[] } | null> {
  if (!(await guideAssigned(guideId, memberId))) return null;
  const access = await activeGuideAccess(guideId, memberId);
  if (!access?.education) return { shared: false, lessons: [] };
  const lessons = await prisma.lesson.findMany({
    orderBy: { sort: "asc" },
    select: {
      id: true,
      title: true,
      minutes: true,
      level: true,
      path: { select: { title: true, sort: true } },
    },
  });
  const [progress, attempts] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { memberId },
      select: { lessonId: true, status: true, completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      select: { lessonId: true, score: true, correct: true, total: true },
    }),
  ]);
  const progressByLesson = new Map(progress.map((row) => [row.lessonId, row]));
  const attemptByLesson = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    if (!attemptByLesson.has(attempt.lessonId)) attemptByLesson.set(attempt.lessonId, attempt);
  }
  const ordered = [...lessons].sort((a, b) => a.path.sort - b.path.sort);
  return {
    shared: true,
    lessons: ordered.map((lesson) => {
      const row = progressByLesson.get(lesson.id);
      const attempt = attemptByLesson.get(lesson.id);
      const status: LessonStatus = row && isLessonStatus(row.status) ? row.status : "notStarted";
      return {
        id: lesson.id,
        pathTitle: lesson.path.title,
        title: lesson.title,
        level: isLessonLevel(lesson.level) ? lesson.level : "beginner",
        minutes: lesson.minutes,
        status,
        completedAt: row?.completedAt ? row.completedAt.toISOString() : null,
        quizScore: attempt ? attempt.score : null,
        quizCorrect: attempt ? attempt.correct : null,
        quizTotal: attempt ? attempt.total : null,
      };
    }),
  };
}
