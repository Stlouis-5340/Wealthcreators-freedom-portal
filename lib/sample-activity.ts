import { buildCheckInSummary, type ActionStatus, type WeeklyCheckInView } from "./check-in";
import type { CoachingNoteView, CoachingTaskView } from "./coaching";
import { totalsFromLines } from "./metrics";
import { assessFreedomQuality } from "./quality";
import { guideSeed, memberSeeds } from "./sample-plans";
import { addCalendarDays, chicagoDateISO, chicagoWeekKey, previousWeekKey } from "./week";

export interface DemoActivity {
  checkIns: WeeklyCheckInView[];
  notes: CoachingNoteView[];
  tasks: CoachingTaskView[];
}

interface Story {
  memberId: string;
  when: "this" | "prior";
  win: string;
  challenge: string;
  actionStatus: ActionStatus;
  commitment: string;
  needsSupport: boolean;
  supportNote: string;
  /** Added to the live Freedom Score on a prior-week snapshot, so a decline is visible. */
  scoreLift: number;
}

const stories: Story[] = [
  {
    memberId: "alex",
    when: "prior",
    win: "Kept housing at the plan amount and tagged the dividend stream.",
    challenge: "The property number is still an estimate, so the gap is not exact.",
    actionStatus: "partial",
    commitment: "Add one durable stream of about $200 a month, or write down why that waits.",
    needsSupport: false,
    supportNote: "",
    scoreLift: 0,
  },
  {
    memberId: "drew",
    when: "prior",
    win: "Wrote housing and food on the plan.",
    challenge: "Most of this year's steps are still open, and the score slipped.",
    actionStatus: "no",
    commitment: "List last quarter's dividend and interest before the next meeting.",
    needsSupport: true,
    supportNote: "I want help deciding which stream to grow first. I am not asking for a product recommendation.",
    scoreLift: 5,
  },
  {
    memberId: "elena",
    when: "this",
    win: "Reconciled net rent for the quarter, including a repair.",
    challenge: "I am not sure the rental math still matches the plan.",
    actionStatus: "partial",
    commitment: "Name the monthly dollars between here and the next checkpoint.",
    needsSupport: true,
    supportNote: "Can we walk through the rental math together? I want to understand it, not be told what to buy.",
    scoreLift: 0,
  },
  {
    memberId: "amina",
    when: "this",
    win: "Held the spending plan flat and left the cash reserve alone.",
    challenge: "A bonus month made it tempting to treat one-time money as a stream.",
    actionStatus: "yes",
    commitment: "Map the path from here to the next band in monthly dollars.",
    needsSupport: false,
    supportNote: "",
    scoreLift: 0,
  },
  {
    memberId: "priya",
    when: "this",
    win: "Wrote the monthly gap to the line in dollars and left the plan flat.",
    challenge: "It is tempting to raise the plan now that coverage is close.",
    actionStatus: "partial",
    commitment: "Keep the plan flat for the rest of the month.",
    needsSupport: false,
    supportNote: "",
    scoreLift: 0,
  },
  {
    memberId: "marcus",
    when: "this",
    win: "Split the surplus into resilience, giving, and time, and scheduled the annual gift.",
    challenge: "The extra coverage makes a larger lifestyle look reasonable.",
    actionStatus: "yes",
    commitment: "Leave the spending plan unchanged this month and give the surplus its job.",
    needsSupport: false,
    supportNote: "",
    scoreLift: 0,
  },
];

/** Demo check-ins, notes, and tasks relative to `now`, so the queues stay current when the seed runs. */
export function demoActivity(now = new Date()): DemoActivity {
  const guide = guideSeed();
  const weekKey = chicagoWeekKey(now);
  const priorKey = previousWeekKey(weekKey);
  const today = chicagoDateISO(now);
  const members = new Map(memberSeeds().map((member) => [member.id, member]));
  const checkIns: WeeklyCheckInView[] = [];

  for (const story of stories) {
    const member = members.get(story.memberId);
    if (!member) continue;
    const metrics = totalsFromLines(member.plan);
    const quality = assessFreedomQuality(member.plan);
    const key = story.when === "this" ? weekKey : priorKey;
    const freedomScore =
      metrics.freedomScore == null ? null : round1(metrics.freedomScore + story.scoreLift);
    const summary = buildCheckInSummary({
      weekKey: key,
      win: story.win,
      challenge: story.challenge,
      actionStatus: story.actionStatus,
      commitment: story.commitment,
      needsSupport: story.needsSupport,
      freedomScore,
      monthlyFreedomGap: metrics.monthlyFreedomGap,
      qualityScore: quality.score,
    });
    const submittedAt = `${key}T18:00:00.000Z`;
    checkIns.push({
      id: `${story.memberId}-${key}`,
      memberId: story.memberId,
      weekKey: key,
      win: story.win,
      challenge: story.challenge,
      actionStatus: story.actionStatus,
      commitment: story.commitment,
      needsSupport: story.needsSupport,
      supportNote: story.supportNote,
      summary,
      freedomScore,
      monthlyFreedomGap: metrics.monthlyFreedomGap,
      qualityScore: quality.score,
      submittedAt,
      updatedAt: submittedAt,
    });
  }

  const notes: CoachingNoteView[] = [
    {
      id: "note-sam-stream",
      memberId: "sam",
      guideId: guide.id,
      guideName: guide.name,
      body: "The plan is written. The open work is naming one passive stream and automating a small amount. This is pace, not a character judgment.",
      createdAt: new Date(Date.parse(`${today}T18:00:00.000Z`) - 10 * 86_400_000).toISOString(),
    },
    {
      id: "note-elena-rent",
      memberId: "elena",
      guideId: guide.id,
      guideName: guide.name,
      body: "Elena asked to walk through the rental math. Stay on the plan figures. Do not recommend a product.",
      createdAt: new Date(Date.parse(`${today}T18:00:00.000Z`) - 86_400_000).toISOString(),
    },
  ];

  const tasks: CoachingTaskView[] = [
    {
      id: "task-sam-stream",
      memberId: "sam",
      guideId: guide.id,
      title: "Name one passive stream",
      dueDate: addCalendarDays(today, -1),
      status: "open",
      source: "guide",
      createdAt: notes[0].createdAt,
      updatedAt: notes[0].createdAt,
    },
    {
      id: "task-drew-rules",
      memberId: "drew",
      guideId: guide.id,
      title: "Bring the passive-income rules note",
      dueDate: addCalendarDays(today, 7),
      status: "open",
      source: "guide",
      createdAt: notes[1].createdAt,
      updatedAt: notes[1].createdAt,
    },
    {
      id: "task-marcus-surplus",
      memberId: "marcus",
      guideId: guide.id,
      title: "Confirm the surplus split",
      dueDate: addCalendarDays(today, -7),
      status: "done",
      source: "guide",
      createdAt: notes[0].createdAt,
      updatedAt: `${today}T18:00:00.000Z`,
    },
  ];

  return { checkIns, notes, tasks };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
