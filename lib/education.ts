/**
 * Education Engine v1.
 *
 * Lessons explain how this portal talks about money. They are not investment,
 * tax, legal, or insurance advice, and they do not tell anyone to buy, sell,
 * borrow, or hold anything.
 */

export const EDUCATION_PLACEHOLDER =
  "Lesson progress is not in the portal yet. This report does not count courses, quizzes, or a learning path. When that exists, this section will show what you finished and what fits the gap you are working on.";

export const EDUCATION_DISCLAIMER =
  "Educational only. These lessons explain how the Freedom Portal talks about money. They are not investment, tax, legal, or insurance advice, and they do not tell you to buy, sell, borrow, or hold anything. Nothing here promises a result. Use them with your Wealth Guide, and with a qualified professional when a decision is regulated.";

export type LessonLevel = "beginner" | "intermediate";
export type LessonStatus = "notStarted" | "inProgress" | "completed";

export interface EducationProgressView {
  total: number;
  completed: number;
  inProgress: number;
  completedTitles: string[];
  note: string;
  /** False when a Guide is not allowed to see learning progress. */
  shared: boolean;
}

export interface QuizScore {
  correct: number;
  total: number;
  /** Percent from 0 to 100. */
  score: number;
  results: boolean[];
}

export interface GuideLessonRow {
  id: string;
  pathTitle: string;
  title: string;
  level: LessonLevel;
  minutes: number;
  status: LessonStatus;
  completedAt: string | null;
  quizScore: number | null;
  quizCorrect: number | null;
  quizTotal: number | null;
}

const MAX_ANSWERS = 8;

export function isLessonLevel(value: string): value is LessonLevel {
  return value === "beginner" || value === "intermediate";
}

export function isLessonStatus(value: string): value is LessonStatus {
  return value === "notStarted" || value === "inProgress" || value === "completed";
}

export function levelLabel(level: LessonLevel): string {
  return level === "beginner" ? "Beginner" : "Intermediate";
}

export function statusLabel(status: LessonStatus): string {
  if (status === "completed") return "Completed";
  if (status === "inProgress") return "In progress";
  return "Not started";
}

export function parseChoices(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

export function scoreQuiz(
  answers: number[],
  key: { answerIndex: number; choiceCount: number }[],
): QuizScore | null {
  if (key.length < 3 || key.length > 5) return null;
  if (answers.length !== key.length || answers.length > MAX_ANSWERS) return null;
  const results = key.map((item, index) => {
    const choice = answers[index];
    return Number.isInteger(choice) && choice >= 0 && choice < item.choiceCount && choice === item.answerIndex;
  });
  if (results.some((_, index) => !Number.isInteger(answers[index]))) return null;
  const correct = results.filter(Boolean).length;
  const total = key.length;
  return {
    correct,
    total,
    score: Math.round((correct / total) * 100),
    results,
  };
}

export function describeEducationProgress(input: {
  total: number;
  completed: number;
  inProgress: number;
  completedTitles: string[];
}): string {
  if (input.total <= 0) return EDUCATION_PLACEHOLDER;
  const titles = input.completedTitles.slice(0, 4);
  const listed = titles.length > 0 ? ` Finished: ${titles.join("; ")}.` : "";
  if (input.completed === 0 && input.inProgress === 0) {
    return `The learning path has ${input.total} lessons. None are finished yet. This is current progress, not a figure frozen with the month. Lessons are educational. They are not investment, tax, or legal advice.`;
  }
  const working =
    input.inProgress > 0
      ? ` ${input.inProgress} ${input.inProgress === 1 ? "is" : "are"} in progress.`
      : "";
  return `Finished ${input.completed} of ${input.total} lessons.${listed}${working} This is where learning stands now, not a figure frozen with the month. Lessons are educational. They are not investment, tax, or legal advice.`;
}

export function hiddenEducationProgress(): EducationProgressView {
  return {
    total: 0,
    completed: 0,
    inProgress: 0,
    completedTitles: [],
    note: "Learning progress is not shared.",
    shared: false,
  };
}

/** Guide rows name the lesson and the score. They do not carry prompts, choices, or answers. */
export function guideLessonIsSafe(row: GuideLessonRow): boolean {
  const payload = JSON.stringify(row);
  return !payload.includes("answerIndex") && !payload.includes("choices") && !payload.includes("prompt");
}
