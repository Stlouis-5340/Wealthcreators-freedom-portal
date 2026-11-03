import { alexLessonProgress, alexQuizAttempt, catalogLessons, educationCatalog } from "@/lib/education-catalog";
import { prisma } from "@/lib/db";
import { demoSchedulingUrl, alexAgendaItem, alexHubMessages, alexHubTask, alexSessionSummary } from "@/lib/sample-hub";

/** Demo catalog, Alex's lesson progress, and one shared workspace with Jordan. */
export async function seedEducationAndHub(memberIds: string[]): Promise<void> {
  for (const [pathIndex, path] of educationCatalog.entries()) {
    await prisma.learningPath.upsert({
      where: { id: path.id },
      create: { id: path.id, title: path.title, summary: path.summary, sort: pathIndex },
      update: { title: path.title, summary: path.summary, sort: pathIndex },
    });
  }

  const rows = catalogLessons();
  const lessonIds = rows.map((row) => row.lesson.id);
  await prisma.quizQuestion.deleteMany({ where: { lessonId: { in: lessonIds } } });
  for (const row of rows) {
    await prisma.lesson.upsert({
      where: { id: row.lesson.id },
      create: {
        id: row.lesson.id,
        pathId: row.path.id,
        title: row.lesson.title,
        summary: row.lesson.summary,
        minutes: row.lesson.minutes,
        level: row.lesson.level,
        body: row.lesson.body,
        exercise: row.lesson.exercise,
        sort: row.sort,
      },
      update: {
        pathId: row.path.id,
        title: row.lesson.title,
        summary: row.lesson.summary,
        minutes: row.lesson.minutes,
        level: row.lesson.level,
        body: row.lesson.body,
        exercise: row.lesson.exercise,
        sort: row.sort,
      },
    });
    if (row.lesson.questions.length > 0) {
      await prisma.quizQuestion.createMany({
        data: row.lesson.questions.map((question, index) => ({
          id: question.id,
          lessonId: row.lesson.id,
          prompt: question.prompt,
          choices: JSON.stringify(question.choices),
          answerIndex: question.answerIndex,
          sort: index,
        })),
      });
    }
  }

  await prisma.quizAttempt.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.lessonProgress.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.lessonProgress.createMany({
    data: alexLessonProgress.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      lessonId: row.lessonId,
      status: row.status,
      completedAt: row.completedAt ? new Date(row.completedAt) : null,
      exerciseDone: row.exerciseDone,
      updatedAt: new Date(row.completedAt ?? "2026-10-26T18:00:00.000Z"),
    })),
  });
  await prisma.quizAttempt.create({
    data: {
      id: alexQuizAttempt.id,
      memberId: alexQuizAttempt.memberId,
      lessonId: alexQuizAttempt.lessonId,
      score: alexQuizAttempt.score,
      correct: alexQuizAttempt.correct,
      total: alexQuizAttempt.total,
      createdAt: new Date(alexQuizAttempt.createdAt),
    },
  });

  await prisma.hubMessage.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.sessionSummary.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.agendaItem.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.hubRead.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.hubMessage.createMany({
    data: alexHubMessages.map((message) => ({
      ...message,
      createdAt: new Date(message.createdAt),
    })),
  });
  await prisma.sessionSummary.create({
    data: {
      ...alexSessionSummary,
      heldAt: new Date(alexSessionSummary.heldAt),
      createdAt: new Date(alexSessionSummary.createdAt),
    },
  });
  await prisma.agendaItem.create({
    data: { ...alexAgendaItem, createdAt: new Date(alexAgendaItem.createdAt) },
  });
  await prisma.coachingTask.deleteMany({ where: { id: alexHubTask.id } });
  await prisma.coachingTask.create({
    data: {
      ...alexHubTask,
      createdAt: new Date(alexHubTask.createdAt),
      updatedAt: new Date(alexHubTask.updatedAt),
    },
  });

  await prisma.user.update({
    where: { id: "jordan" },
    data: { schedulingUrl: demoSchedulingUrl },
  });
}
