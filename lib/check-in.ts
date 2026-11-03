import { formatMoney } from "./format";
import { formatWeekSpan } from "./week";

export type ActionStatus = "yes" | "partial" | "no";

export interface WeeklyCheckInView {
  id: string;
  memberId: string;
  weekKey: string;
  win: string;
  challenge: string;
  actionStatus: ActionStatus;
  commitment: string;
  needsSupport: boolean;
  supportNote: string;
  summary: string;
  freedomScore: number | null;
  monthlyFreedomGap: number | null;
  qualityScore: number | null;
  submittedAt: string;
  updatedAt: string;
}

export interface CheckInDraft {
  win: string;
  challenge: string;
  actionStatus: string;
  commitment: string;
  needsSupport: boolean;
  supportNote: string;
}

export interface NormalizedCheckIn {
  win: string;
  challenge: string;
  actionStatus: ActionStatus;
  commitment: string;
  needsSupport: boolean;
  supportNote: string;
}

const MAX_ANSWER = 1000;

export function isActionStatus(value: string): value is ActionStatus {
  return value === "yes" || value === "partial" || value === "no";
}

export function actionLabel(status: ActionStatus): string {
  if (status === "yes") return "Yes";
  if (status === "partial") return "Partly";
  return "Not yet";
}

export function parseCheckInDraft(
  input: CheckInDraft,
): { ok: true; value: NormalizedCheckIn } | { ok: false; message: string } {
  const win = clean(input.win);
  const challenge = clean(input.challenge);
  const commitment = clean(input.commitment);
  const supportNote = clean(input.supportNote);
  if (!win) return { ok: false, message: "Add a financial win for this week." };
  if (!challenge) return { ok: false, message: "Add the challenge you faced this week." };
  if (!isActionStatus(input.actionStatus)) {
    return { ok: false, message: "Say whether the priority action was done, partly done, or not done." };
  }
  if (!commitment) return { ok: false, message: "Add the commitment you are making next." };
  if (typeof input.needsSupport !== "boolean") {
    return { ok: false, message: "Say whether you need support from your Wealth Guide." };
  }
  for (const answer of [win, challenge, commitment, supportNote]) {
    if (answer.length > MAX_ANSWER) {
      return { ok: false, message: "Keep each answer under 1,000 characters." };
    }
  }
  return {
    ok: true,
    value: {
      win,
      challenge,
      actionStatus: input.actionStatus,
      commitment,
      needsSupport: input.needsSupport,
      supportNote,
    },
  };
}

export function buildCheckInSummary(input: {
  weekKey: string;
  win: string;
  challenge: string;
  actionStatus: ActionStatus;
  commitment: string;
  needsSupport: boolean;
  freedomScore: number | null;
  monthlyFreedomGap: number | null;
  qualityScore: number | null;
}): string {
  const score =
    input.freedomScore == null
      ? "Freedom Score was not available"
      : `Freedom Score ${input.freedomScore.toFixed(1)}%`;
  const gap =
    input.monthlyFreedomGap == null
      ? "Freedom Gap was not available"
      : `Freedom Gap ${formatMoney(input.monthlyFreedomGap)} a month`;
  const quality =
    input.qualityScore == null
      ? "Freedom Quality did not have enough plan data"
      : `Freedom Quality ${Math.round(input.qualityScore)}/100`;
  const action =
    input.actionStatus === "yes"
      ? "The priority action was completed"
      : input.actionStatus === "partial"
        ? "The priority action was partly done"
        : "The priority action was not completed";
  const support = input.needsSupport
    ? "Support from the Wealth Guide was requested."
    : "No Guide support was requested.";
  return [
    `Week of ${formatWeekSpan(input.weekKey)}.`,
    `${score}.`,
    `${gap}.`,
    `${quality}.`,
    `${action}.`,
    `Win: ${clip(input.win)}.`,
    `Challenge: ${clip(input.challenge)}.`,
    `Next commitment: ${clip(input.commitment)}.`,
    support,
  ].join(" ");
}

export function toCheckInView(row: {
  id: string;
  memberId: string;
  weekKey: string;
  win: string;
  challenge: string;
  actionStatus: string;
  commitment: string;
  needsSupport: boolean;
  supportNote: string;
  summary: string;
  freedomScore: number | null;
  monthlyFreedomGap: number | null;
  qualityScore: number | null;
  submittedAt: Date | string;
  updatedAt: Date | string;
}): WeeklyCheckInView {
  return {
    id: row.id,
    memberId: row.memberId,
    weekKey: row.weekKey,
    win: row.win,
    challenge: row.challenge,
    actionStatus: isActionStatus(row.actionStatus) ? row.actionStatus : "no",
    commitment: row.commitment,
    needsSupport: row.needsSupport,
    supportNote: row.supportNote,
    summary: row.summary,
    freedomScore: row.freedomScore,
    monthlyFreedomGap: row.monthlyFreedomGap,
    qualityScore: row.qualityScore,
    submittedAt: asIso(row.submittedAt),
    updatedAt: asIso(row.updatedAt),
  };
}

export function sortCheckIns(checkIns: WeeklyCheckInView[]): WeeklyCheckInView[] {
  return [...checkIns].sort(
    (a, b) => b.weekKey.localeCompare(a.weekKey) || b.updatedAt.localeCompare(a.updatedAt),
  );
}

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function clip(value: string, max = 140): string {
  const trimmed = clean(value);
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
