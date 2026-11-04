import { SCORE_DROP_POINTS } from "./command-center";
import { bands, stageTitle } from "./milestones";
import { chicagoDateISO, chicagoWeekKey, formatWeekSpan } from "./week";

/** A member with a sign-in date or a check-in inside this window counts as active. */
export const ACTIVE_WINDOW_DAYS = 30;

export const LEADERSHIP_CAVEAT =
  "Guides are not ranked by Freedom Score. Members start from different places, and a Guide does not control wages, household costs, or the plan a member brought in. Read score change next to the cohort and the engagement on that roster.";

export const LEADERSHIP_METHODS = [
  "Improving means the live Freedom Score is at least 1 point above the earliest saved check-in or monthly report. Members with no saved score stay out of the percentage and the average.",
  "The baseline on a Freedom goal is the member's starting circumstance. It is shown on the roster and is not used in the percentage.",
  "A milestone counts when the live score has reached that band: 25, 50, 75, 100, or 125. The headline count is anyone at or above 25%.",
  "Active means the account is not paused and either the activity date or a check-in falls in the last 30 days. The activity date is the one stored on the member.",
  "Goal completion counts this-year steps marked done. A finished goal is one whose progress has reached 100%.",
  "Guide reply time runs from the last note in a member burst on the shared workspace to the next Guide reply. The median uses replies only. Notes still waiting are counted beside it. Message text is not loaded on this page.",
  "Coaching notes, session summaries, and Freedom Coach chats are counted. Their words stay on the member record.",
] as const;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export interface ScoreSnapshot {
  at: string;
  score: number;
  label: string;
}

export interface LeadershipMemberInput {
  id: string;
  name: string;
  cohort: string;
  guides: { id: string; name: string }[];
  isActive: boolean;
  lastActive: string;
  liveScore: number | null;
  goalBaseline: number | null;
  snapshots: ScoreSnapshot[];
  stepsDone: number;
  stepsTotal: number;
  goalsFinished: number;
  goalsTotal: number;
  checkIns: { weekKey: string; score: number | null; submittedAt: string }[];
  coachThread: boolean;
  coachMemberMessages: number;
  lessonsCompleted: number;
  lessonsInProgress: number;
  challengesActive: number;
  challengesCompleted: number;
  notes: { guideId: string }[];
  sessions: { guideId: string }[];
  tasksDone: number;
  tasksOpen: number;
}

export interface LeadershipGuideInput {
  id: string;
  name: string;
}

/** One workspace message. guideId is the author when they are a Guide, otherwise the assigned Guide. */
export interface HubTurn {
  memberId: string;
  at: string;
  author: "member" | "guide";
  guideId: string;
}

export interface LeadershipInput {
  now: Date;
  lessonCatalog: number;
  members: LeadershipMemberInput[];
  guides: LeadershipGuideInput[];
  turns: HubTurn[];
}

export interface ReplySample {
  memberId: string;
  guideId: string;
  hours: number | null;
  waiting: boolean;
}

export interface CohortRow {
  cohort: string;
  members: number;
  improving: number;
  compared: number;
  averagePoints: number | null;
  stepsDone: number;
  stepsTotal: number;
  checkIns: number;
  lessonsCompleted: number;
  active: number;
}

export interface GuideContextRow {
  id: string;
  name: string;
  members: number;
  cohortMix: string;
  medianScoreChange: number | null;
  compared: number;
  withCheckIn: number;
  checkedInThisWeek: number;
  notes: number;
  sessions: number;
  medianReplyHours: number | null;
  waiting: number;
}

export interface MemberOutcomeRow {
  id: string;
  name: string;
  cohort: string;
  guideNames: string;
  activity: "Active" | "Quiet" | "Paused";
  lastActive: string;
  band: string;
  liveScore: number | null;
  goalBaseline: number | null;
  changeLabel: string;
  changeDetail: string;
  recentLabel: string;
  points: number | null;
  direction: "up" | "down" | "flat" | "none";
  stepsDone: number;
  stepsTotal: number;
  checkIns: number;
  lessonsCompleted: number;
  challenges: number;
}

export interface LeadershipAnalytics {
  asOfLabel: string;
  activeWindowDays: number;
  members: number;
  caveat: string;
  methods: readonly string[];
  improving: {
    percent: number | null;
    improved: number;
    declined: number;
    flat: number;
    compared: number;
    unscored: number;
    averagePoints: number | null;
    detail: string;
  };
  milestones: {
    reachedFirst: number;
    belowFirst: number;
    bands: { threshold: number; title: string; members: number }[];
  };
  retention: {
    active: number;
    quiet: number;
    paused: number;
    quietNames: string[];
  };
  goals: {
    stepsDone: number;
    stepsTotal: number;
    goalsFinished: number;
    goalsTotal: number;
    stepPercent: number | null;
  };
  engagement: {
    checkIns: number;
    checkedInThisWeek: number;
    coachMembers: number;
    coachMemberMessages: number;
    lessonsCompleted: number;
    lessonsInProgress: number;
    lessonCatalog: number;
    challengeActive: number;
    challengeCompleted: number;
    challengeMembers: number;
  };
  coaching: {
    notes: number;
    sessions: number;
    tasksDone: number;
    tasksOpen: number;
    replies: number;
    waiting: number;
    medianReplyHours: number | null;
  };
  recentDeclines: { id: string; name: string; points: number }[];
  cohorts: CohortRow[];
  guides: GuideContextRow[];
  roster: MemberOutcomeRow[];
}

interface ScoredMember {
  input: LeadershipMemberInput;
  points: number | null;
  direction: "up" | "down" | "flat" | "none";
  earliest: ScoreSnapshot | null;
  recentPoints: number | null;
  recentLabel: string;
  active: boolean;
}

export function cohortLabel(value: string): string {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : "Unassigned";
}

export function formatPoints(value: number): string {
  const rounded = round1(value);
  const abs = Math.abs(rounded);
  const digits = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1);
  if (rounded > 0) return `+${digits}`;
  if (rounded < 0) return `−${digits}`;
  return "0";
}

export function formatReplyHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  const rounded = round1(hours);
  const digits = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return rounded === 1 ? "1 hour" : `${digits} hours`;
}

/** Pair each member burst with the next Guide reply. Text is not an input. */
export function guideReplySamples(turns: HubTurn[]): ReplySample[] {
  const byMember = new Map<string, HubTurn[]>();
  for (const turn of turns) {
    const list = byMember.get(turn.memberId) ?? [];
    list.push(turn);
    byMember.set(turn.memberId, list);
  }
  const samples: ReplySample[] = [];
  for (const [memberId, list] of byMember) {
    list.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.author.localeCompare(b.author));
    for (let index = 0; index < list.length; index += 1) {
      const turn = list[index];
      if (turn.author !== "member") continue;
      if (list[index + 1]?.author === "member") continue;
      const reply = list.slice(index + 1).find((item) => item.author === "guide");
      if (!reply) {
        samples.push({ memberId, guideId: turn.guideId, hours: null, waiting: true });
        continue;
      }
      const hours = (Date.parse(reply.at) - Date.parse(turn.at)) / HOUR_MS;
      if (!Number.isFinite(hours) || hours < 0) continue;
      samples.push({ memberId, guideId: reply.guideId, hours: round1(hours), waiting: false });
    }
  }
  return samples;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return round1(sorted[mid]);
  return round1((sorted[mid - 1] + sorted[mid]) / 2);
}

export function buildLeadershipAnalytics(input: LeadershipInput): LeadershipAnalytics {
  const weekKey = chicagoWeekKey(input.now);
  const asOf = chicagoDateISO(input.now);
  const scored = input.members.map((member) => scoreMember(member, input.now, weekKey));
  const compared = scored.filter((member) => member.points != null);
  const improved = compared.filter((member) => member.direction === "up");
  const declined = compared.filter((member) => member.direction === "down");
  const flat = compared.filter((member) => member.direction === "flat");
  const unscored = scored.filter((member) => member.points == null);
  const averagePoints =
    compared.length > 0 ? round1(compared.reduce((total, member) => total + (member.points ?? 0), 0) / compared.length) : null;
  const replies = guideReplySamples(input.turns);
  const answered = replies.flatMap((sample) => (sample.hours == null ? [] : [sample.hours]));
  const waiting = replies.filter((sample) => sample.waiting);

  const withScore = scored.filter((member) => member.input.liveScore != null);
  const bandRows = bands.map((band) => ({
    threshold: band.threshold,
    title: band.title,
    members: withScore.filter((member) => (member.input.liveScore ?? 0) >= band.threshold).length,
  }));

  const stepsDone = sum(scored, (member) => member.input.stepsDone);
  const stepsTotal = sum(scored, (member) => member.input.stepsTotal);
  const active = scored.filter((member) => member.active);
  const quiet = scored.filter((member) => member.input.isActive && !member.active);

  const improvingDetail = compared.length
    ? `${improved.length} of ${compared.length} with a saved score ${improved.length === 1 ? "is" : "are"} up. ${countClause(declined.length, "is down", "are down")}. ${countClause(flat.length, "is flat", "are flat")}. ${unscoredClause(unscored.length)}`
    : "No saved Freedom Score yet, so the percentage is waiting on a check-in or a monthly report.";

  return {
    asOfLabel: asOf,
    activeWindowDays: ACTIVE_WINDOW_DAYS,
    members: scored.length,
    caveat: LEADERSHIP_CAVEAT,
    methods: LEADERSHIP_METHODS,
    improving: {
      percent: compared.length > 0 ? Math.round((improved.length / compared.length) * 100) : null,
      improved: improved.length,
      declined: declined.length,
      flat: flat.length,
      compared: compared.length,
      unscored: unscored.length,
      averagePoints,
      detail: improvingDetail,
    },
    milestones: {
      reachedFirst: withScore.filter((member) => (member.input.liveScore ?? 0) >= bands[0].threshold).length,
      belowFirst: withScore.filter((member) => (member.input.liveScore ?? 0) < bands[0].threshold).length,
      bands: bandRows,
    },
    retention: {
      active: active.length,
      quiet: quiet.length,
      paused: scored.filter((member) => !member.input.isActive).length,
      quietNames: quiet.map((member) => member.input.name).sort((a, b) => a.localeCompare(b)),
    },
    goals: {
      stepsDone,
      stepsTotal,
      goalsFinished: sum(scored, (member) => member.input.goalsFinished),
      goalsTotal: sum(scored, (member) => member.input.goalsTotal),
      stepPercent: stepsTotal > 0 ? Math.round((stepsDone / stepsTotal) * 100) : null,
    },
    engagement: {
      checkIns: sum(scored, (member) => member.input.checkIns.length),
      checkedInThisWeek: scored.filter((member) => member.input.checkIns.some((checkIn) => checkIn.weekKey === weekKey)).length,
      coachMembers: scored.filter((member) => member.input.coachThread).length,
      coachMemberMessages: sum(scored, (member) => member.input.coachMemberMessages),
      lessonsCompleted: sum(scored, (member) => member.input.lessonsCompleted),
      lessonsInProgress: sum(scored, (member) => member.input.lessonsInProgress),
      lessonCatalog: input.lessonCatalog,
      challengeActive: sum(scored, (member) => member.input.challengesActive),
      challengeCompleted: sum(scored, (member) => member.input.challengesCompleted),
      challengeMembers: scored.filter((member) => member.input.challengesActive + member.input.challengesCompleted > 0).length,
    },
    coaching: {
      notes: sum(scored, (member) => member.input.notes.length),
      sessions: sum(scored, (member) => member.input.sessions.length),
      tasksDone: sum(scored, (member) => member.input.tasksDone),
      tasksOpen: sum(scored, (member) => member.input.tasksOpen),
      replies: answered.length,
      waiting: waiting.length,
      medianReplyHours: median(answered),
    },
    recentDeclines: scored
      .flatMap((member) => {
        if (!member.recentLabel || member.recentPoints == null || member.recentPoints > -SCORE_DROP_POINTS) return [];
        return [{ id: member.input.id, name: member.input.name, points: round1(Math.abs(member.recentPoints)) }];
      })
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)),
    cohorts: cohortRows(scored),
    guides: guideRows(input.guides, scored, replies, weekKey),
    roster: scored
      .map((member) => toRosterRow(member))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function scoreMember(member: LeadershipMemberInput, now: Date, weekKey: string): ScoredMember {
  const earliest = earliestSnapshot(member.snapshots);
  const live = member.liveScore;
  const points = earliest && live != null && Number.isFinite(live) ? round1(live - earliest.score) : null;
  const direction = directionFor(points);
  const prior = latestPriorCheckIn(member.checkIns, weekKey);
  const recentPoints = prior && prior.score != null && live != null ? round1(live - prior.score) : null;
  const recentLabel = recentLine(prior, recentPoints, earliest);
  return {
    input: member,
    points,
    direction,
    earliest,
    recentPoints,
    recentLabel,
    active: isActiveMember(member, now),
  };
}

function earliestSnapshot(snapshots: ScoreSnapshot[]): ScoreSnapshot | null {
  const usable = snapshots.filter((snapshot) => Number.isFinite(snapshot.score) && Number.isFinite(Date.parse(snapshot.at)));
  if (usable.length === 0) return null;
  return [...usable].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.label.localeCompare(b.label))[0];
}

function latestPriorCheckIn(
  checkIns: LeadershipMemberInput["checkIns"],
  weekKey: string,
): { weekKey: string; score: number | null } | null {
  const prior = checkIns.filter((checkIn) => checkIn.weekKey < weekKey && checkIn.score != null);
  if (prior.length === 0) return null;
  return [...prior].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0];
}

function recentLine(
  prior: { weekKey: string; score: number | null } | null,
  points: number | null,
  earliest: ScoreSnapshot | null,
): string {
  if (!prior || points == null) return "";
  const sameAsEarliest = earliest?.label.includes(formatWeekSpan(prior.weekKey)) && earliest.score === prior.score;
  if (sameAsEarliest) return "";
  if (points === 0) return `Flat since the ${formatWeekSpan(prior.weekKey)} check-in.`;
  return `Since the ${formatWeekSpan(prior.weekKey)} check-in: ${formatPoints(points)} pts.`;
}

function directionFor(points: number | null): ScoredMember["direction"] {
  if (points == null) return "none";
  if (points >= 1) return "up";
  if (points <= -1) return "down";
  return "flat";
}

function isActiveMember(member: LeadershipMemberInput, now: Date): boolean {
  if (!member.isActive) return false;
  if (recentDate(member.lastActive, now)) return true;
  return member.checkIns.some((checkIn) => recentInstant(checkIn.submittedAt, now));
}

function recentDate(isoDate: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  return recentInstant(`${isoDate}T00:00:00.000Z`, now);
}

function recentInstant(iso: string, now: Date): boolean {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return false;
  const age = now.getTime() - at;
  return age >= 0 && age <= ACTIVE_WINDOW_DAYS * DAY_MS;
}

function cohortRows(scored: ScoredMember[]): CohortRow[] {
  const groups = new Map<string, ScoredMember[]>();
  for (const member of scored) {
    const label = cohortLabel(member.input.cohort);
    const list = groups.get(label) ?? [];
    list.push(member);
    groups.set(label, list);
  }
  return [...groups.entries()]
    .sort((a, b) => cohortRank(a[0]) - cohortRank(b[0]) || a[0].localeCompare(b[0]))
    .map(([cohort, members]) => {
      const compared = members.filter((member) => member.points != null);
      return {
        cohort,
        members: members.length,
        improving: compared.filter((member) => member.direction === "up").length,
        compared: compared.length,
        averagePoints:
          compared.length > 0
            ? round1(compared.reduce((total, member) => total + (member.points ?? 0), 0) / compared.length)
            : null,
        stepsDone: sum(members, (member) => member.input.stepsDone),
        stepsTotal: sum(members, (member) => member.input.stepsTotal),
        checkIns: sum(members, (member) => member.input.checkIns.length),
        lessonsCompleted: sum(members, (member) => member.input.lessonsCompleted),
        active: members.filter((member) => member.active).length,
      };
    });
}

function guideRows(
  guides: LeadershipGuideInput[],
  scored: ScoredMember[],
  replies: ReplySample[],
  weekKey: string,
): GuideContextRow[] {
  return [...guides]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((guide) => {
      const members = scored.filter((member) => member.input.guides.some((item) => item.id === guide.id));
      const compared = members.filter((member) => member.points != null);
      const weekReplies = replies.filter((sample) => sample.guideId === guide.id && sample.hours != null).map((sample) => sample.hours ?? 0);
      const mix = new Map<string, number>();
      for (const member of members) {
        const label = cohortLabel(member.input.cohort);
        mix.set(label, (mix.get(label) ?? 0) + 1);
      }
      return {
        id: guide.id,
        name: guide.name,
        members: members.length,
        cohortMix: mix.size === 0 ? "No assigned members" : cohortMix(mix),
        medianScoreChange: median(compared.flatMap((member) => (member.points == null ? [] : [member.points]))),
        compared: compared.length,
        withCheckIn: members.filter((member) => member.input.checkIns.length > 0).length,
        checkedInThisWeek: members.filter((member) => member.input.checkIns.some((checkIn) => checkIn.weekKey === weekKey)).length,
        notes: sum(members, (member) => member.input.notes.filter((note) => note.guideId === guide.id).length),
        sessions: sum(members, (member) => member.input.sessions.filter((session) => session.guideId === guide.id).length),
        medianReplyHours: median(weekReplies),
        waiting: replies.filter((sample) => sample.guideId === guide.id && sample.waiting).length,
      };
    });
}

function toRosterRow(member: ScoredMember): MemberOutcomeRow {
  const earliest = member.earliest;
  const changeDetail = earliest
    ? `Since ${earliest.label}: ${member.points == null ? "—" : `${formatPoints(member.points)} pts`}.`
    : "No check-in or monthly report has saved a Freedom Score yet.";
  const names = member.input.guides.map((guide) => guide.name).sort((a, b) => a.localeCompare(b));
  return {
    id: member.input.id,
    name: member.input.name,
    cohort: cohortLabel(member.input.cohort),
    guideNames: names.length > 0 ? names.join(", ") : "Unassigned",
    activity: !member.input.isActive ? "Paused" : member.active ? "Active" : "Quiet",
    lastActive: member.input.lastActive,
    band: stageTitle(member.input.liveScore),
    liveScore: member.input.liveScore,
    goalBaseline: member.input.goalBaseline,
    changeLabel: changeLabel(member),
    changeDetail,
    recentLabel: member.recentLabel,
    points: member.points,
    direction: member.direction,
    stepsDone: member.input.stepsDone,
    stepsTotal: member.input.stepsTotal,
    checkIns: member.input.checkIns.length,
    lessonsCompleted: member.input.lessonsCompleted,
    challenges: member.input.challengesActive + member.input.challengesCompleted,
  };
}

function changeLabel(member: ScoredMember): string {
  if (member.points == null) return "No saved score";
  if (member.direction === "up") return `Up ${formatPoints(member.points).slice(1)} pts`;
  if (member.direction === "down") return `Down ${formatPoints(member.points).slice(1)} pts`;
  return "Flat";
}

function cohortMix(counts: Map<string, number>): string {
  return [...counts.entries()]
    .sort((a, b) => cohortRank(a[0]) - cohortRank(b[0]) || a[0].localeCompare(b[0]))
    .map(([label, count]) => `${count} ${label}`)
    .join(", ");
}

function cohortRank(label: string): number {
  if (label === "Foundation") return 0;
  if (label === "Building") return 1;
  if (label === "Near the line") return 2;
  if (label === "Unassigned") return 9;
  return 5;
}

function countClause(count: number, singular: string, plural: string): string {
  if (count === 0) return `None ${plural}`;
  return `${count} ${count === 1 ? singular : plural}`;
}

function unscoredClause(count: number): string {
  if (count === 0) return "Every member has a saved score.";
  if (count === 1) return "1 has no saved score.";
  return `${count} have no saved score.`;
}

function sum<T>(items: T[], read: (item: T) => number): number {
  return items.reduce((total, item) => total + read(item), 0);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
