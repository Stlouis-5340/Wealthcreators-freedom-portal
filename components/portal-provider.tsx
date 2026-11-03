"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { WeeklyCheckInView } from "@/lib/check-in";
import type { CoachingNoteView, CoachingTaskView } from "@/lib/coaching";
import { assessPlanIntegrity, type DataIntegrity } from "@/lib/integrity";
import { computeMetrics } from "@/lib/metrics";
import {
  resetPlanAction,
  setAssetValuationAction,
  toggleStepAction,
  updateAssetAction,
  updateExpenseAction,
  updateLiabilityAction,
  updateStreamAction,
} from "@/lib/plan-actions";
import {
  nonNegative,
  type ConnectedItem,
  type PortalSnapshot,
  type PortalViewer,
  type StoredMemberPlan,
} from "@/lib/plans";
import { memberRow, type RosterRow } from "@/lib/roster";
import { isSyncedLine } from "@/lib/plaid-labels";
import type {
  AssetLine,
  ExpenseLine,
  LiabilityLine,
  ManualValuation,
  Metrics,
  PassiveStream,
} from "@/lib/types";

interface PortalContextValue {
  viewer: PortalViewer;
  metrics: Metrics;
  roster: RosterRow[];
  expenses: ExpenseLine[];
  streams: PassiveStream[];
  assets: AssetLine[];
  liabilities: LiabilityLine[];
  plaidConfigured: boolean;
  connectedItems: ConnectedItem[];
  updateExpense: (id: string, monthly: number) => void;
  updateStream: (id: string, monthly: number) => void;
  updateAsset: (id: string, balance: number) => void;
  setAssetValuation: (id: string, valuation: ManualValuation) => void;
  updateLiability: (id: string, balance: number) => void;
  lineIntegrity: Record<string, DataIntegrity>;
  toggleStep: (id: string) => void;
  resetDemo: () => void;
  memberById: (id: string) => RosterRow | undefined;
}

const PortalContext = createContext<PortalContextValue | null>(null);

interface MemberActivity {
  checkIns: WeeklyCheckInView[];
  notes: CoachingNoteView[];
  tasks: CoachingTaskView[];
}

function activityFor(rows: RosterRow[], id: string): MemberActivity {
  const row = rows.find((member) => member.id === id);
  return {
    checkIns: row?.checkIns ?? [],
    notes: row?.notes ?? [],
    tasks: row?.tasks ?? [],
  };
}

const emptyMetrics = computeMetrics({
  monthlyPassive: 0,
  monthlyExpenses: 0,
  totalAssets: 0,
  totalLiabilities: 0,
});

function withAmount<T extends { id: string }>(
  lines: T[],
  id: string,
  key: keyof T,
  amount: number,
): T[] {
  return lines.map((line) => (line.id === id ? { ...line, [key]: amount } : line));
}

export function PortalProvider({
  snapshot,
  children,
}: {
  snapshot: PortalSnapshot;
  children: ReactNode;
}) {
  const [plan, setPlan] = useState<StoredMemberPlan | null>(snapshot.plan);
  const [guideRoster, setGuideRoster] = useState<RosterRow[]>(snapshot.roster);
  const [activity, setActivity] = useState<MemberActivity>(() =>
    activityFor(snapshot.roster, snapshot.plan?.id ?? snapshot.viewer.id),
  );
  const [connectedItems, setConnectedItems] = useState<ConnectedItem[]>(snapshot.connectedItems);
  const [signature, setSignature] = useState(snapshot.signature);
  const chains = useRef(new Map<string, Promise<void>>());

  if (snapshot.signature !== signature) {
    setSignature(snapshot.signature);
    setPlan(snapshot.plan);
    setGuideRoster(snapshot.roster);
    setActivity(activityFor(snapshot.roster, snapshot.plan?.id ?? snapshot.viewer.id));
    setConnectedItems(snapshot.connectedItems);
  }

  const value = useMemo<PortalContextValue>(() => {
    const roster = plan
      ? [
          {
            ...memberRow(plan),
            checkIns: activity.checkIns,
            notes: activity.notes,
            tasks: activity.tasks,
          },
        ]
      : guideRoster;
    const lineIntegrity = plan ? assessPlanIntegrity(plan).lines : {};
    const metrics = plan
      ? computeMetrics({
          monthlyPassive: plan.streams.reduce((sum, line) => sum + line.monthly, 0),
          monthlyExpenses: plan.expenses.reduce((sum, line) => sum + line.monthly, 0),
          totalAssets: plan.assets.reduce((sum, line) => sum + line.balance, 0),
          totalLiabilities: plan.liabilities.reduce((sum, line) => sum + line.balance, 0),
        })
      : emptyMetrics;

    function enqueue(key: string, run: () => Promise<void>) {
      const previous = chains.current.get(key) ?? Promise.resolve();
      const next = previous.then(run, run);
      chains.current.set(key, next);
    }

    function updatePlan(next: StoredMemberPlan | null) {
      setPlan(next);
    }

    return {
      viewer: snapshot.viewer,
      metrics,
      roster,
      expenses: plan?.expenses ?? [],
      streams: plan?.streams ?? [],
      assets: plan?.assets ?? [],
      liabilities: plan?.liabilities ?? [],
      lineIntegrity,
      plaidConfigured: snapshot.plaidConfigured,
      connectedItems,
      updateExpense: (id, monthly) => {
        if (!plan) return;
        const amount = nonNegative(monthly);
        updatePlan({ ...plan, expenses: withAmount(plan.expenses, id, "monthly", amount) });
        enqueue(`expense:${id}`, () => updateExpenseAction(id, amount));
      },
      updateStream: (id, monthly) => {
        if (!plan) return;
        const amount = nonNegative(monthly);
        updatePlan({ ...plan, streams: withAmount(plan.streams, id, "monthly", amount) });
        enqueue(`stream:${id}`, () => updateStreamAction(id, amount));
      },
      updateAsset: (id, balance) => {
        if (!plan) return;
        const amount = nonNegative(balance);
        const confirmedAt = new Date().toISOString();
        updatePlan({
          ...plan,
          assets: plan.assets.map((line) =>
            line.id === id ? { ...line, balance: amount, confirmedAt } : line,
          ),
        });
        enqueue(`asset:${id}`, () => updateAssetAction(id, amount));
      },
      setAssetValuation: (id, valuation) => {
        if (!plan || isSyncedLine(id)) return;
        const confirmedAt = new Date().toISOString();
        updatePlan({
          ...plan,
          assets: plan.assets.map((line) =>
            line.id === id ? { ...line, valuation, confirmedAt } : line,
          ),
        });
        enqueue(`asset-flag:${id}`, () => setAssetValuationAction(id, valuation));
      },
      updateLiability: (id, balance) => {
        if (!plan) return;
        const amount = nonNegative(balance);
        updatePlan({ ...plan, liabilities: withAmount(plan.liabilities, id, "balance", amount) });
        enqueue(`liability:${id}`, () => updateLiabilityAction(id, amount));
      },
      toggleStep: (id) => {
        if (!plan) return;
        const step = plan.goals.flatMap((goal) => goal.steps).find((item) => item.id === id);
        if (!step) return;
        const done = !step.done;
        updatePlan({
          ...plan,
          goals: plan.goals.map((goal) => ({
            ...goal,
            steps: goal.steps.map((item) => (item.id === id ? { ...item, done } : item)),
          })),
        });
        enqueue(`step:${id}`, () => toggleStepAction(id, done));
      },
      resetDemo: () => {
        const home =
          snapshot.viewer.role === "guide" ? "/guide" : snapshot.viewer.role === "admin" ? "/admin" : "/";
        void resetPlanAction().then(() => {
          window.location.assign(home);
        });
      },
      memberById: (id) => roster.find((member) => member.id === id),
    };
  }, [activity, connectedItems, guideRoster, plan, snapshot.plaidConfigured, snapshot.viewer]);

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalContextValue {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortal must be used within PortalProvider");
  }
  return context;
}
