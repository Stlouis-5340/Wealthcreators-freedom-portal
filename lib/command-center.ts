import type { WeeklyCheckInView } from "./check-in";
import { sortCheckIns } from "./check-in";
import type { CoachingTaskView } from "./coaching";
import { AS_OF_YEAR } from "./format";
import type { RosterRow } from "./roster";
import { chicagoDateISO, chicagoWeekKey, formatWeekSpan } from "./week";

/** A live Freedom Score this many points below an earlier check-in snapshot is "declining". */
export const SCORE_DROP_POINTS = 2;

export interface AttentionItem {
  memberId: string;
  reason: string;
}

export interface AttentionQueues {
  support: AttentionItem[];
  missed: AttentionItem[];
  declining: AttentionItem[];
  behind: AttentionItem[];
  progress: AttentionItem[];
}

export function attentionQueues(rows: RosterRow[], now = new Date()): AttentionQueues {
  const weekKey = chicagoWeekKey(now);
  const today = chicagoDateISO(now);
  const support: AttentionItem[] = [];
  const missed: AttentionItem[] = [];
  const declining: { item: AttentionItem; drop: number }[] = [];
  const behind: { item: AttentionItem; ratio: number }[] = [];
  const progress: { item: AttentionItem; score: number }[] = [];

  for (const row of rows) {
    const checkIns = row.access.checkIns ? sortCheckIns(row.checkIns) : [];
    if (row.access.checkIns) {
      const supportReason = requestedSupportReason(checkIns);
      if (supportReason) support.push({ memberId: row.id, reason: supportReason });

      const missedReasonText = missedCheckInReason(checkIns, weekKey);
      if (missedReasonText) missed.push({ memberId: row.id, reason: missedReasonText });
    }

    const liveScore = row.access.score && Number.isFinite(row.metrics.freedomScore) ? row.metrics.freedomScore : null;
    const decline =
      row.access.score && row.access.checkIns ? declineReason(checkIns, liveScore, weekKey) : null;
    if (decline) declining.push({ item: { memberId: row.id, reason: decline.reason }, drop: decline.drop });

    const behindText = behindReason(
      {
        goals: row.access.goals ? row.goals : [],
        stepsDone: row.access.goals ? row.stepsDone : 0,
        stepsTotal: row.access.goals ? row.stepsTotal : 0,
        tasks: row.access.tasks ? row.tasks : [],
      },
      today,
    );
    if (behindText) {
      const ratio = row.stepsTotal > 0 ? row.stepsDone / row.stepsTotal : 1;
      behind.push({ item: { memberId: row.id, reason: behindText }, ratio });
    }

    const progressText = progressReason(
      {
        goals: row.access.goals ? row.goals : [],
        stepsDone: row.access.goals ? row.stepsDone : 0,
        stepsTotal: row.access.goals ? row.stepsTotal : 0,
        metrics: {
          ...row.metrics,
          freedomScore: row.access.score && Number.isFinite(row.metrics.freedomScore) ? row.metrics.freedomScore : null,
        },
      },
      row.access.checkIns ? checkIns : [],
      weekKey,
    );
    if (progressText) {
      progress.push({
        item: { memberId: row.id, reason: progressText },
        score: row.access.score && row.metrics.freedomScore != null ? row.metrics.freedomScore : -1,
      });
    }
  }

  support.sort((a, b) => nameOf(rows, a.memberId).localeCompare(nameOf(rows, b.memberId)));
  missed.sort((a, b) => {
    const quiet = daysOf(rows, b.memberId) - daysOf(rows, a.memberId);
    if (quiet !== 0) return quiet;
    return nameOf(rows, a.memberId).localeCompare(nameOf(rows, b.memberId));
  });
  declining.sort((a, b) => b.drop - a.drop || nameOf(rows, a.item.memberId).localeCompare(nameOf(rows, b.item.memberId)));
  behind.sort((a, b) => a.ratio - b.ratio || nameOf(rows, a.item.memberId).localeCompare(nameOf(rows, b.item.memberId)));
  progress.sort((a, b) => b.score - a.score || nameOf(rows, a.item.memberId).localeCompare(nameOf(rows, b.item.memberId)));

  return {
    support,
    missed,
    declining: declining.map((entry) => entry.item),
    behind: behind.map((entry) => entry.item),
    progress: progress.map((entry) => entry.item),
  };
}

export function requestedSupportReason(checkIns: WeeklyCheckInView[]): string | null {
  const latest = sortCheckIns(checkIns)[0];
  if (!latest?.needsSupport) return null;
  const note = latest.supportNote.trim();
  const extra = note ? ` Note: ${clip(note, 180)}` : "";
  return `Asked for Wealth Guide support on the week of ${formatWeekSpan(latest.weekKey)}.${extra}`;
}

export function missedCheckInReason(checkIns: WeeklyCheckInView[], weekKey: string): string | null {
  const sorted = sortCheckIns(checkIns);
  if (sorted.some((checkIn) => checkIn.weekKey === weekKey)) return null;
  const prior = sorted[0];
  const earlier = prior
    ? `Last check-in was the week of ${formatWeekSpan(prior.weekKey)}.`
    : "There is no earlier check-in on file.";
  return `No check-in for the week of ${formatWeekSpan(weekKey)}. ${earlier}`;
}

export function declineReason(
  checkIns: WeeklyCheckInView[],
  freedomScore: number | null,
  weekKey: string,
): { reason: string; drop: number } | null {
  if (freedomScore == null) return null;
  const prior = sortCheckIns(checkIns).find(
    (checkIn) => checkIn.weekKey < weekKey && checkIn.freedomScore != null,
  );
  if (!prior || prior.freedomScore == null) return null;
  const drop = prior.freedomScore - freedomScore;
  if (drop < SCORE_DROP_POINTS) return null;
  return {
    drop,
    reason: `Freedom Score is ${freedomScore.toFixed(1)}%, down from ${prior.freedomScore.toFixed(1)}% saved on the week of ${formatWeekSpan(prior.weekKey)} check-in (a drop of ${drop.toFixed(1)} points). This compares the live score with a check-in snapshot. There is no daily score history.`,
  };
}

export function behindReason(row: Pick<RosterRow, "goals" | "stepsDone" | "stepsTotal" | "tasks">, today: string): string | null {
  const reasons: string[] = [];
  const missed = row.goals.flatMap((goal) =>
    goal.checkpoints
      .filter((checkpoint) => checkpoint.status === "missed")
      .map((checkpoint) => `${checkpoint.calendarYear} checkpoint “${checkpoint.label}” on “${goal.title}”`),
  );
  if (missed.length > 0) {
    reasons.push(
      `A past checkpoint was not met: ${missed[0]}. Steps have no due date, so this uses the year on the checkpoint.`,
    );
  }

  const ratio = row.stepsTotal > 0 ? row.stepsDone / row.stepsTotal : 1;
  const currentOpen = row.goals.some((goal) =>
    goal.checkpoints.some(
      (checkpoint) => checkpoint.calendarYear === AS_OF_YEAR && checkpoint.status === "current",
    ),
  );
  if (currentOpen && row.stepsTotal > 0 && ratio < 0.4) {
    const open = row.goals.flatMap((goal) => goal.steps).find((step) => !step.done);
    const next = open ? ` Next open step: ${open.title}.` : "";
    reasons.push(
      `This year's checkpoint is still open, and ${row.stepsDone} of ${row.stepsTotal} steps are done.${next} Steps have no due date, so this is pace, not an overdue task.`,
    );
  }

  const overdue = overdueTasks(row.tasks, today);
  if (overdue.length > 0) {
    const task = overdue[0];
    reasons.push(`Open Guide task “${task.title}” was due ${task.dueDate} and is still open.`);
  }

  if (reasons.length === 0) return null;
  return reasons.join(" ");
}

export function progressReason(
  row: Pick<RosterRow, "goals" | "stepsDone" | "stepsTotal" | "metrics">,
  checkIns: WeeklyCheckInView[],
  weekKey: string,
): string | null {
  const reasons: string[] = [];
  const score = row.metrics.freedomScore;
  if (row.stepsTotal > 0 && row.stepsDone === row.stepsTotal) {
    reasons.push(`All ${row.stepsTotal} steps this year are done.`);
  }
  if (score != null && score >= 100) {
    reasons.push(`Freedom Score is ${score.toFixed(1)}%, at or above the line.`);
  }
  const met = row.goals
    .filter((goal) => goal.progressSource === "freedom")
    .flatMap((goal) => goal.checkpoints)
    .find(
      (checkpoint) =>
        checkpoint.calendarYear === AS_OF_YEAR &&
        (checkpoint.status === "complete" || checkpoint.status === "ahead"),
    );
  if (met) {
    reasons.push(`This year's Freedom checkpoint is met (${met.label}).`);
  }
  const current = sortCheckIns(checkIns).find((checkIn) => checkIn.weekKey === weekKey);
  const ratio = row.stepsTotal > 0 ? row.stepsDone / row.stepsTotal : 0;
  if (
    current?.actionStatus === "yes" &&
    row.stepsTotal > 0 &&
    row.stepsDone < row.stepsTotal &&
    ratio >= 0.75
  ) {
    reasons.push(
      `This week's priority action was completed, with ${row.stepsDone} of ${row.stepsTotal} steps done.`,
    );
  }
  if (reasons.length === 0) return null;
  return reasons.join(" ");
}

function overdueTasks(tasks: CoachingTaskView[], today: string): CoachingTaskView[] {
  return tasks.filter((task) => task.status === "open" && task.dueDate !== "" && task.dueDate < today);
}

function nameOf(rows: RosterRow[], id: string): string {
  return rows.find((row) => row.id === id)?.name ?? id;
}

function daysOf(rows: RosterRow[], id: string): number {
  return rows.find((row) => row.id === id)?.daysSinceActive ?? 0;
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}
