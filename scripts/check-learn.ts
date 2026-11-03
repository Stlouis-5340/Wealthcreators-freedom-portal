import { educationCatalog, catalogLessons } from "../lib/education-catalog";
import {
  describeEducationProgress,
  EDUCATION_DISCLAIMER,
  guideLessonIsSafe,
  parseChoices,
  scoreQuiz,
  type GuideLessonRow,
} from "../lib/education";
import { EDUCATION_PLACEHOLDER } from "../lib/report";
import { parseAgendaItem, parseHubMessage, parseSchedulingUrl, resolveSchedulingUrl } from "../lib/hub";
import { alexHubMessages, alexSessionSummary } from "../lib/sample-hub";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const lessons = catalogLessons();
assert(lessons.length >= 6 && lessons.length <= 10, "the catalog has 6 to 10 lessons");
assert(educationCatalog.length >= 2, "lessons sit on paths");
const quizzed = lessons.filter((row) => row.lesson.questions.length > 0);
assert(quizzed.length >= 2 && quizzed.length <= 3, "two or three lessons have a quiz");
for (const row of quizzed) {
  assert(
    row.lesson.questions.length >= 3 && row.lesson.questions.length <= 5,
    `${row.lesson.id} has 3 to 5 questions`,
  );
  for (const question of row.lesson.questions) {
    assert(question.choices.length >= 2, "each question has choices");
    assert(question.answerIndex >= 0 && question.answerIndex < question.choices.length, "the answer is one of the choices");
  }
}
const withExercise = lessons.filter((row) => row.lesson.exercise.trim().length > 0);
assert(withExercise.length >= 2, "some lessons have an action exercise");
assert(
  withExercise.some((row) => /check-in/i.test(row.lesson.exercise)),
  "an exercise uses check-in language",
);
assert(
  withExercise.some((row) => /goal/i.test(row.lesson.exercise)),
  "an exercise uses goal language",
);
assert(EDUCATION_DISCLAIMER.toLowerCase().includes("not investment"), "the disclaimer refuses investment advice");

const scoreLesson = lessons.find((row) => row.lesson.id === "lesson-freedom-score");
assert(scoreLesson, "the Freedom Score lesson exists");
const key = scoreLesson.lesson.questions.map((question) => ({
  answerIndex: question.answerIndex,
  choiceCount: question.choices.length,
}));
const perfect = scoreQuiz(key.map((item) => item.answerIndex), key);
assert(perfect?.score === 100 && perfect.correct === 4, "a perfect quiz scores 100");
const missed = scoreQuiz([0, 0, 0, 1], key);
assert(missed?.correct === 3 && missed.score === 75, "three of four is 75");
assert(scoreQuiz([0], key) == null, "a short answer sheet is rejected");

const note = describeEducationProgress({
  total: lessons.length,
  completed: 2,
  inProgress: 1,
  completedTitles: ["What financial freedom means here", "The spending plan"],
});
assert(note.includes("Finished 2 of"), "the report names how many lessons are finished");
assert(note.includes("The spending plan"), "the report names a finished lesson");
assert(note.toLowerCase().includes("not investment"), "the report line stays educational");
assert(describeEducationProgress({ total: 0, completed: 0, inProgress: 0, completedTitles: [] }) === EDUCATION_PLACEHOLDER, "an empty catalog keeps the old sentence");

const guideRow: GuideLessonRow = {
  id: "lesson-freedom-score",
  pathTitle: "Freedom foundations",
  title: "How to read your Freedom Score",
  level: "beginner",
  minutes: 12,
  status: "inProgress",
  completedAt: null,
  quizScore: 75,
  quizCorrect: 3,
  quizTotal: 4,
};
assert(guideLessonIsSafe(guideRow), "a guide row has no quiz answers");
assert(!JSON.stringify(guideRow).includes("Wages from a job"), "a guide row does not include a choice");

const catalogText = JSON.stringify(educationCatalog);
for (const word of ["Vanguard", "Fidelity", "accessToken", "passwordHash", "guaranteed", "guarantee"]) {
  assert(!catalogText.includes(word), `catalog included ${word}`);
}
assert(parseChoices(JSON.stringify(["A", "B"])).join(",") === "A,B", "choices round-trip");

const message = parseHubMessage(alexHubMessages[0].body);
assert(message.ok, "a seeded message fits");
assert(!parseHubMessage("   ").ok, "an empty message is refused");
assert(!parseHubMessage("x".repeat(501)).ok, "a long message is refused");
assert(parseAgendaItem(alexSessionSummary.nextSteps).ok, "a next step can also be an agenda line");
const link = parseSchedulingUrl("https://calendly.com/wealthcreators-demo/coaching");
assert(link.ok && link.value.startsWith("https://"), "a scheduling link is accepted");
assert(!parseSchedulingUrl("javascript:alert(1)").ok, "a script link is refused");
assert(
  resolveSchedulingUrl("", "https://example.com/book") === "https://example.com/book",
  "the env link is the fallback",
);
assert(
  resolveSchedulingUrl("https://calendly.com/guide/intro", "https://example.com/book") === "https://calendly.com/guide/intro",
  "a profile link wins",
);

console.log(`learn and hub checks passed (${lessons.length} lessons, ${quizzed.length} quizzes)`);
