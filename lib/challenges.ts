/**
 * 30, 60, and 90 day challenges.
 *
 * Progress is a percent or a checklist. Measured rules use the plan and check-ins
 * already on file. They do not read bank transactions, and they do not tell a
 * member what to buy. Guide cards are titles, status, and a percent. Evidence
 * JSON stays on the server.
 */

import type { GuideAccess } from "@/lib/access";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { addCalendarDays, chicagoDateISO, chicagoWeekKey, previousWeekKey } from "@/lib/week";

export type ChallengeStatus = "active" | "completed" | "abandoned";

export type Verifier = "spend-under-plan" | "score-up" | "lessons" | "check-in-streak" | "no-new-debt";

export interface ChecklistItem {
  key: string;
  label: string;
  /** Short reading. Only the lessons challenge uses this. */
  body?: string;
}

export interface ChallengeDefinition {
  id: string;
  title: string;
  summary: string;
  durationDays: 30 | 60 | 90;
  verifier: Verifier;
  checklist: ChecklistItem[];
  sort: number;
}

/** Three short readings a member can mark inside the lessons challenge. Not a course catalog. */
export const foundationLessons: ChecklistItem[] = [
  {
    key: "passive-rules",
    label: "What counts as passive income",
    body: "Dividends, interest, net rent, royalties, lending yield, and pension-like income can count. Salary, gifts, and selling principal do not.",
  },
  {
    key: "plan-honest",
    label: "Keep the spending plan honest",
    body: "The plan is the Freedom Score denominator. Confirm the categories still match the life you mean to fund.",
  },
  {
    key: "name-a-stream",
    label: "Name one durable stream",
    body: "Write the stream, the monthly dollars, and why it is repeatable. This is a planning note, not an instruction to buy an investment.",
  },
];

const spendWeeks: ChecklistItem[] = [
  { key: "week-1", label: "Week 1 stayed at or under the plan" },
  { key: "week-2", label: "Week 2 stayed at or under the plan" },
  { key: "week-3", label: "Week 3 stayed at or under the plan" },
  { key: "week-4", label: "Week 4 stayed at or under the plan" },
];

export const challengeCatalog: ChallengeDefinition[] = [
  {
    id: "spend-under-plan",
    title: "Spend less than the plan",
    summary:
      "Four weekly confirmations that spending stayed inside the plan. You mark them. Card transactions are not read.",
    durationDays: 30,
    verifier: "spend-under-plan",
    checklist: spendWeeks,
    sort: 0,
  },
  {
    id: "score-up",
    title: "Raise Freedom Score 5 points",
    summary:
      "Five points on Freedom Score, from the plan you already keep. The portal measures the score. It does not tell you what to buy.",
    durationDays: 60,
    verifier: "score-up",
    checklist: [],
    sort: 1,
  },
  {
    id: "finish-lessons",
    title: "Finish 3 lessons",
    summary:
      "Three short lessons already used with the milestones. Mark one when you have read it. This is not a course certificate.",
    durationDays: 30,
    verifier: "lessons",
    checklist: foundationLessons,
    sort: 2,
  },
  {
    id: "check-in-streak",
    title: "Weekly check-in streak",
    summary:
      "Four America/Chicago weeks in a row with a saved check-in, counting from the week you enroll.",
    durationDays: 30,
    verifier: "check-in-streak",
    checklist: [],
    sort: 3,
  },
  {
    id: "no-new-debt",
    title: "No new consumer debt",
    summary:
      "Liability balances stay at or under the total on the day you enroll. This checks new borrowing. It does not set a payoff order.",
    durationDays: 90,
    verifier: "no-new-debt",
    checklist: [],
    sort: 4,
  },
];

const catalogById = new Map(challengeCatalog.map((item) => [item.id, item]));

export function challengeById(id: string): ChallengeDefinition | null {
  return catalogById.get(id) ?? null;
}

export const STREAK_WEEKS = 4;
export const SCORE_POINTS = 5;

export interface ChallengeEvidence {
  baselineScore: number | null;
  baselineLiabilities: number | null;
  checks: Record<string, boolean>;
}

export interface ProgressFacts {
  freedomScore: number | null;
  totalLiabilities: number;
  checkInWeeks: string[];
  completedLessonKeys: string[];
  now: Date;
}

export interface ChecklistView {
  key: string;
  label: string;
  body: string;
  done: boolean;
}

export interface ProgressSnapshot {
  progress: number;
  status: ChallengeStatus;
  checklist: ChecklistView[] | null;
  /** Member-only. May include their own totals. Never send this to a Guide. */
  memberNote: string;
}

const blockedName = /access[_-]?token|passwordHash|vanguard|fidelity|treasurydirect|\bplaid\b/i;

export function parseEvidence(raw: string): ChallengeEvidence {
  const empty: ChallengeEvidence = { baselineScore: null, baselineLiabilities: null, checks: {} };
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
    const record = value as Record<string, unknown>;
    const checks: Record<string, boolean> = {};
    if (record.checks && typeof record.checks === "object" && !Array.isArray(record.checks)) {
      for (const [key, item] of Object.entries(record.checks as Record<string, unknown>)) {
        if (item === true) checks[key] = true;
      }
    }
    return {
      baselineScore: finiteOrNull(record.baselineScore),
      baselineLiabilities: finiteOrNull(record.baselineLiabilities),
      checks,
    };
  } catch {
    return empty;
  }
}

export function encodeEvidence(evidence: ChallengeEvidence): string {
  return JSON.stringify({
    baselineScore: evidence.baselineScore,
    baselineLiabilities: evidence.baselineLiabilities,
    checks: evidence.checks,
  });
}

export function initialEvidence(verifier: Verifier, facts: Pick<ProgressFacts, "freedomScore" | "totalLiabilities">): ChallengeEvidence {
  if (verifier === "score-up") {
    return { baselineScore: facts.freedomScore, baselineLiabilities: null, checks: {} };
  }
  if (verifier === "no-new-debt") {
    return { baselineScore: null, baselineLiabilities: facts.totalLiabilities, checks: {} };
  }
  return { baselineScore: null, baselineLiabilities: null, checks: {} };
}

export function windowEnd(startedAt: Date, durationDays: number): Date {
  const iso = addCalendarDays(chicagoDateISO(startedAt), durationDays);
  // 18:00 UTC is still the same calendar day in America/Chicago.
  return new Date(`${iso}T18:00:00.000Z`);
}

export function parseMemberIds(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    const ids = value.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length < 80);
    return [...new Set(ids)].slice(0, 6);
  } catch {
    return [];
  }
}

export function cleanGroupName(raw: string): string | null {
  const cleaned = raw.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  if (cleaned.length < 2) return null;
  if (blockedName.test(cleaned) || cleaned.includes("$")) return null;
  return cleaned;
}

export function guideGroupName(raw: string): string {
  const cleaned = raw.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || blockedName.test(cleaned) || cleaned.includes("$")) return "Accountability group";
  return cleaned;
}

export function measureProgress(input: {
  definition: ChallengeDefinition;
  status: ChallengeStatus;
  startedAt: Date;
  evidence: ChallengeEvidence;
  facts: ProgressFacts;
}): ProgressSnapshot {
  const { definition, evidence, facts } = input;
  const checklist = checklistView(definition, evidence, facts.completedLessonKeys);
  const computed = clampPercent(progressValue(definition, input.startedAt, evidence, facts, checklist));
  const status = nextStatus(input.status, computed, definition.verifier);
  const checklistVerifier = definition.verifier === "spend-under-plan" || definition.verifier === "lessons";
  const progress = status === "completed" && !checklistVerifier ? 100 : computed;
  return {
    progress,
    status,
    checklist,
    memberNote: memberNote(definition, input.startedAt, evidence, facts, progress, status),
  };
}

export interface GuideEnrollmentCard {
  id: string;
  title: string;
  durationDays: number;
  status: ChallengeStatus;
  progress: number;
  endsOn: string;
  groupName: string | null;
  groupSize: number | null;
}

/** Assigned Guides see status and a percent. Dollar evidence and bank names stay off. */
export function presentEnrollmentForGuide(
  row: {
    id: string;
    challengeId: string;
    status: string;
    progress: number;
    endsAt: Date;
    evidence: string;
  },
  group: { name: string; size: number } | null,
  access: GuideAccess,
): GuideEnrollmentCard | null {
  const definition = challengeById(row.challengeId);
  if (!definition || !visibleToGuide(definition.verifier, access)) return null;
  const status = isStatus(row.status) ? row.status : "active";
  return {
    id: row.id,
    title: definition.title,
    durationDays: definition.durationDays,
    status,
    progress: clampPercent(row.progress),
    endsOn: endsOn(row.endsAt),
    groupName: group ? guideGroupName(group.name) : null,
    groupSize: group ? group.size : null,
  };
}

function visibleToGuide(verifier: Verifier, access: GuideAccess): boolean {
  if (verifier === "score-up") return access.score;
  if (verifier === "check-in-streak") return access.checkIns;
  if (verifier === "no-new-debt") return access.totals;
  return true;
}

function checklistView(
  definition: ChallengeDefinition,
  evidence: ChallengeEvidence,
  lessonKeys: string[],
): ChecklistView[] | null {
  if (definition.checklist.length === 0) return null;
  const lessons = new Set(lessonKeys);
  return definition.checklist.map((item) => ({
    key: item.key,
    label: item.label,
    body: item.body ?? "",
    done: definition.verifier === "lessons" ? lessons.has(item.key) : evidence.checks[item.key] === true,
  }));
}

function progressValue(
  definition: ChallengeDefinition,
  startedAt: Date,
  evidence: ChallengeEvidence,
  facts: ProgressFacts,
  checklist: ChecklistView[] | null,
): number {
  if (definition.verifier === "spend-under-plan" || definition.verifier === "lessons") {
    if (!checklist || checklist.length === 0) return 0;
    return (checklist.filter((item) => item.done).length / checklist.length) * 100;
  }
  if (definition.verifier === "score-up") {
    if (evidence.baselineScore == null || facts.freedomScore == null) return 0;
    return ((facts.freedomScore - evidence.baselineScore) / SCORE_POINTS) * 100;
  }
  if (definition.verifier === "check-in-streak") {
    const count = streakSince(facts.checkInWeeks, chicagoWeekKey(startedAt), facts.now);
    return (count / STREAK_WEEKS) * 100;
  }
  if (evidence.baselineLiabilities == null) return 0;
  if (facts.totalLiabilities > evidence.baselineLiabilities + 0.5) return 0;
  const elapsed = calendarDaysBetween(chicagoDateISO(startedAt), chicagoDateISO(facts.now));
  return (Math.max(0, elapsed) / definition.durationDays) * 100;
}

function nextStatus(previous: ChallengeStatus, progress: number, verifier: Verifier): ChallengeStatus {
  if (previous === "abandoned") return "abandoned";
  if (progress >= 100) return "completed";
  if (previous === "completed" && (verifier === "spend-under-plan" || verifier === "lessons")) return "active";
  return previous;
}

function memberNote(
  definition: ChallengeDefinition,
  startedAt: Date,
  evidence: ChallengeEvidence,
  facts: ProgressFacts,
  progress: number,
  status: ChallengeStatus,
): string {
  const endIso = endsOn(windowEnd(startedAt, definition.durationDays));
  const end = formatDate(endIso);
  const closed = chicagoDateISO(facts.now) >= endIso;
  if (definition.verifier === "score-up") {
    if (evidence.baselineScore == null || facts.freedomScore == null) {
      return "Freedom Score needs a spending plan above zero before this challenge can move.";
    }
    return `Freedom Score was ${formatPercent(evidence.baselineScore, 1)} at the start and is ${formatPercent(facts.freedomScore, 1)} now. Five points is the mark. This is a measurement, not a promise. Window ends ${end}.`;
  }
  if (definition.verifier === "no-new-debt") {
    if (evidence.baselineLiabilities == null) return "The starting total was not saved.";
    const held = facts.totalLiabilities <= evidence.baselineLiabilities + 0.5;
    const base = `Starting liability total ${formatMoney(evidence.baselineLiabilities)}. Today ${formatMoney(facts.totalLiabilities)}.`;
    if (!held) return `${base} Balances are above the start, so the challenge is not met. Account names are not part of this check.`;
    if (status === "completed") return `${base} The full window stayed at or under the start.`;
    return `${base} Still at or under the start. ${progress} percent of the ${definition.durationDays} days have passed. Window ends ${end}.`;
  }
  if (definition.verifier === "check-in-streak") {
    const count = streakSince(facts.checkInWeeks, chicagoWeekKey(startedAt), facts.now);
    return `${count} of ${STREAK_WEEKS} weekly check-ins in a row since you enrolled. Window ends ${end}.`;
  }
  if (closed && status !== "completed") return `The window ended ${end}. You can still finish the list, or set this aside.`;
  return `Window ends ${end}.`;
}

/** Consecutive check-in weeks ending at this week, or last week if this week is still open. */
export function streakSince(weekKeys: string[], startWeek: string, now: Date): number {
  const set = new Set(weekKeys);
  const current = chicagoWeekKey(now);
  let cursor = set.has(current) ? current : previousWeekKey(current);
  let count = 0;
  while (set.has(cursor) && cursor >= startWeek) {
    count += 1;
    cursor = previousWeekKey(cursor);
  }
  return count;
}

export function calendarDaysBetween(startIso: string, endIso: string): number {
  const start = dateUtc(startIso);
  const end = dateUtc(endIso);
  if (start == null || end == null) return 0;
  return Math.round((end - start) / 86_400_000);
}

function dateUtc(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isStatus(value: string): value is ChallengeStatus {
  return value === "active" || value === "completed" || value === "abandoned";
}

function endsOn(endsAt: Date): string {
  return chicagoDateISO(endsAt);
}

export function statusLabel(status: ChallengeStatus): string {
  if (status === "completed") return "Completed";
  if (status === "abandoned") return "Set aside";
  return "Active";
}
