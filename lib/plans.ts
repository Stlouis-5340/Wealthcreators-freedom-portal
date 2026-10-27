import type {
  AssetLine,
  ExpenseLine,
  Goal,
  LiabilityLine,
  PassiveStream,
  Role,
} from "@/lib/types";
import type { RosterRow } from "@/lib/roster";

export interface StoredMemberPlan {
  id: string;
  name: string;
  email: string;
  lastActive: string;
  coachingNote: string;
  expenses: ExpenseLine[];
  streams: PassiveStream[];
  assets: AssetLine[];
  liabilities: LiabilityLine[];
  goals: Goal[];
}

export interface PortalViewer {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ConnectedAccount {
  id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  balance: number;
  bucket: "asset" | "liability";
}

export interface ConnectedItem {
  id: string;
  institutionName: string;
  accounts: ConnectedAccount[];
}

export interface PortalSnapshot {
  viewer: PortalViewer;
  plan: StoredMemberPlan | null;
  roster: RosterRow[];
  plaidConfigured: boolean;
  connectedItems: ConnectedItem[];
  signature: string;
}

export function nonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function planSignature(plans: StoredMemberPlan[]): string {
  return plans
    .map((plan) =>
      [
        plan.id,
        plan.expenses.map((line) => `${line.id}:${line.monthly}`).join(","),
        plan.streams.map((line) => `${line.id}:${line.monthly}`).join(","),
        plan.assets.map((line) => `${line.id}:${line.balance}`).join(","),
        plan.liabilities.map((line) => `${line.id}:${line.balance}`).join(","),
        plan.goals
          .flatMap((goal) => goal.steps.map((step) => `${step.id}:${step.done ? 1 : 0}`))
          .join(","),
      ].join("|"),
    )
    .join("||");
}

/** Totals and goal steps only, so a guide payload does not list account lines. */
export function guideSignature(plans: StoredMemberPlan[]): string {
  return plans
    .map((plan) => {
      const expenses = plan.expenses.reduce((sum, line) => sum + line.monthly, 0);
      const passive = plan.streams.reduce((sum, line) => sum + line.monthly, 0);
      const assets = plan.assets.reduce((sum, line) => sum + line.balance, 0);
      const liabilities = plan.liabilities.reduce((sum, line) => sum + line.balance, 0);
      const steps = plan.goals
        .flatMap((goal) => goal.steps.map((step) => `${step.id}:${step.done ? 1 : 0}`))
        .join(",");
      return [plan.id, expenses, passive, assets, liabilities, steps].join("|");
    })
    .join("||");
}

export function toClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
