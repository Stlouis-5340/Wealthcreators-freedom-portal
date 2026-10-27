export type Role = "member" | "guide";

export type GoalKind = "wealth" | "personal";

export type ProgressSource = "freedom" | "netWorth" | "journey";

export type CheckpointStatus =
  | "complete"
  | "current"
  | "upcoming"
  | "ahead"
  | "missed";

export interface Checkpoint {
  year: 1 | 2 | 3 | 4 | 5 | 6;
  calendarYear: number;
  label: string;
  targetValue?: number;
}

export interface GoalStep {
  id: string;
  title: string;
  detail: string;
  done: boolean;
}

export interface Goal {
  id: string;
  kind: GoalKind;
  title: string;
  summary: string;
  progressSource: ProgressSource;
  baseline?: number;
  baselineLabel?: string;
  target?: number;
  targetLabel: string;
  checkpoints: Checkpoint[];
  steps: GoalStep[];
}

export interface ResolvedCheckpoint extends Checkpoint {
  status: CheckpointStatus;
}

export interface ResolvedGoal extends Omit<Goal, "checkpoints" | "steps"> {
  progress: number;
  progressNote: string;
  currentLabel: string;
  checkpoints: ResolvedCheckpoint[];
  steps: GoalStep[];
  stepsDone: number;
}

export interface ExpenseLine {
  id: string;
  name: string;
  monthly: number;
  note: string;
}

export interface PassiveStream {
  id: string;
  name: string;
  monthly: number;
  source: string;
}

export interface AssetLine {
  id: string;
  name: string;
  institution: string;
  group: "Cash" | "Investments" | "Property" | "Retirement";
  balance: number;
}

export interface LiabilityLine {
  id: string;
  name: string;
  balance: number;
  note: string;
}

export interface Metrics {
  monthlyPassive: number;
  monthlyExpenses: number;
  annualPassive: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  freedomScore: number | null;
  yieldOnAssets: number | null;
  yieldOnNetWorth: number | null;
  monthlySurplus: number;
}
