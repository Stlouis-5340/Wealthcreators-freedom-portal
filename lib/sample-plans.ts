import { randomBytes } from "node:crypto";
import { demoAccounts } from "@/lib/demo-accounts";
import { demoPassword } from "@/lib/demo-passwords";
import {
  alexAssets,
  alexExpenses,
  alexGoals,
  alexIdentity,
  alexLiabilities,
  alexStreams,
  staticMembers,
  type MemberSeed,
} from "@/lib/sample-data";
import type { Goal } from "@/lib/types";

export interface SeedCheckpoint {
  id: string;
  year: number;
  calendarYear: number;
  label: string;
  targetValue: number | null;
  sort: number;
}

export interface SeedStep {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  sort: number;
}

export interface SeedGoal {
  id: string;
  kind: string;
  title: string;
  summary: string;
  progressSource: string;
  baseline: number | null;
  baselineLabel: string | null;
  target: number | null;
  targetLabel: string;
  sort: number;
  checkpoints: SeedCheckpoint[];
  steps: SeedStep[];
}

export interface SeedPlan {
  expenses: { id: string; name: string; monthly: number; note: string; sort: number }[];
  streams: { id: string; name: string; monthly: number; source: string; sort: number }[];
  assets: {
    id: string;
    name: string;
    institution: string;
    group: string;
    balance: number;
    sort: number;
    /** "estimated" or "verified". See lib/integrity.ts. */
    valuation: "estimated" | "verified";
    /** income, appreciation, lifestyle, or omitted to assume from the holding type. */
    capitalRole?: string;
    /**
     * Last manual confirmation. The duplex date is before the 14-day stale
     * window so the demo shows a stale label. Cash is confirmed on the
     * sample as-of date. Null means the member has not dated the figure.
     */
    confirmedAt: Date | null;
  }[];
  liabilities: { id: string; name: string; balance: number; note: string; sort: number }[];
  goals: SeedGoal[];
}

export interface SeedMember {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "member";
  lastActive: string;
  coachingNote: string;
  rosterSort: number;
  plan: SeedPlan;
}

export interface SeedGuide {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "guide";
}

const GUIDE_ID = "jordan";

export function guideSeed(): SeedGuide {
  const account = demoAccounts.find((item) => item.id === GUIDE_ID);
  if (!account) throw new Error("Jordan Lee is missing from the demo accounts.");
  return {
    id: account.id,
    email: account.email,
    password: demoPassword(account.id).password,
    name: account.name,
    role: "guide",
  };
}

function mapGoals(goals: Goal[]): SeedGoal[] {
  return goals.map((goal, goalIndex) => ({
    id: goal.id,
    kind: goal.kind,
    title: goal.title,
    summary: goal.summary,
    progressSource: goal.progressSource,
    baseline: goal.baseline ?? null,
    baselineLabel: goal.baselineLabel ?? null,
    target: goal.target ?? null,
    targetLabel: goal.targetLabel,
    sort: goalIndex,
    checkpoints: goal.checkpoints.map((checkpoint, index) => ({
      id: `${goal.id}-y${checkpoint.year}`,
      year: checkpoint.year,
      calendarYear: checkpoint.calendarYear,
      label: checkpoint.label,
      targetValue: checkpoint.targetValue ?? null,
      sort: index,
    })),
    steps: goal.steps.map((step, index) => ({
      id: step.id,
      title: step.title,
      detail: step.detail,
      done: step.done,
      sort: index,
    })),
  }));
}

const alexCapitalRole: Record<string, string> = {
  brokerage: "income",
  cash: "income",
  duplex: "income",
  retirement: "appreciation",
  home: "lifestyle",
};

const assetConfidence: Record<string, { valuation: "estimated" | "verified"; confirmedAt: Date | null }> = {
  // Confirmed on the sample as-of date. Inside the 14-day window on 2026-11-03.
  cash: { valuation: "verified", confirmedAt: new Date("2026-10-27T00:00:00.000Z") },
  // September 1 is older than STALE_AFTER_MS, so this manual value is stale.
  duplex: { valuation: "estimated", confirmedAt: new Date("2026-09-01T00:00:00.000Z") },
};

function alexPlan(): SeedPlan {
  return {
    expenses: alexExpenses.map((line, sort) => ({ ...line, sort })),
    streams: alexStreams.map((line, sort) => ({ ...line, sort })),
    assets: alexAssets.map((line, sort) => ({
      ...line,
      sort,
      valuation: assetConfidence[line.id]?.valuation ?? "estimated",
      confirmedAt: assetConfidence[line.id]?.confirmedAt ?? null,
      capitalRole: alexCapitalRole[line.id] ?? "",
    })),
    liabilities: alexLiabilities.map((line, sort) => ({ ...line, sort })),
    goals: mapGoals(alexGoals),
  };
}

function aggregatePlan(member: MemberSeed): SeedPlan {
  return {
    expenses: [
      {
        id: `${member.id}-plan`,
        name: "Spending plan",
        monthly: member.expensesMonthly,
        note: "Spending plan used as the Freedom Score denominator.",
        sort: 0,
      },
    ],
    streams: [
      {
        id: `${member.id}-passive`,
        name: "Passive income",
        monthly: member.passiveMonthly,
        source: "Tagged passive income",
        sort: 0,
      },
    ],
    assets: [
      {
        id: `${member.id}-assets`,
        name: "Assets",
        institution: "",
        group: "Investments",
        balance: member.assetsTotal,
        sort: 0,
        valuation: "estimated" as const,
        confirmedAt: null,
      },
    ],
    liabilities: [
      {
        id: `${member.id}-liabilities`,
        name: "Liabilities",
        balance: member.liabilitiesTotal,
        note: "Balances owed.",
        sort: 0,
      },
    ],
    goals: mapGoals(member.goals),
  };
}

function memberPassword(id: string): string {
  const account = demoAccounts.find((item) => item.id === id);
  if (account) return demoPassword(account.id).password;
  return randomBytes(32).toString("hex");
}

export function memberSeeds(): SeedMember[] {
  const alexAccount = demoAccounts.find((item) => item.id === alexIdentity.id);
  if (!alexAccount) throw new Error("Alex Rivera is missing from the demo accounts.");
  const alex: SeedMember = {
    id: alexIdentity.id,
    email: alexAccount.email,
    password: demoPassword(alexAccount.id).password,
    name: alexIdentity.name,
    role: "member",
    lastActive: alexIdentity.lastActive,
    coachingNote: "",
    rosterSort: 0,
    plan: alexPlan(),
  };
  const rest = staticMembers.map((member, index) => ({
    id: member.id,
    email: `${member.id}@members.wealthcreators.test`,
    password: memberPassword(member.id),
    name: member.name,
    role: "member" as const,
    lastActive: member.lastActive,
    coachingNote: member.coachingNote,
    rosterSort: index + 1,
    plan: aggregatePlan(member),
  }));
  return [alex, ...rest];
}

export function assignmentSeeds(): { guideId: string; memberId: string; sort: number }[] {
  return memberSeeds().map((member) => ({
    guideId: GUIDE_ID,
    memberId: member.id,
    sort: member.rosterSort,
  }));
}
