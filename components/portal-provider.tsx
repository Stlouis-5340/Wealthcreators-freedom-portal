"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { totalsFromLines } from "@/lib/metrics";
import { buildRoster, type RosterRow } from "@/lib/roster";
import {
  alexAssets,
  alexExpenses,
  alexGoals,
  alexLiabilities,
  alexStreams,
} from "@/lib/sample-data";
import type {
  AssetLine,
  ExpenseLine,
  LiabilityLine,
  Metrics,
  PassiveStream,
  Role,
} from "@/lib/types";

const STORAGE_KEY = "wc-freedom-portal-v1";

interface PersistedState {
  v: 1;
  role: Role;
  expenses: Record<string, number>;
  streams: Record<string, number>;
  assets: Record<string, number>;
  liabilities: Record<string, number>;
  steps: Record<string, boolean>;
}

const EMPTY: PersistedState = {
  v: 1,
  role: "member",
  expenses: {},
  streams: {},
  assets: {},
  liabilities: {},
  steps: {},
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedParsed: PersistedState = EMPTY;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readClient(): PersistedState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  if (!raw) {
    cachedParsed = EMPTY;
    return EMPTY;
  }
  try {
    const parsed = JSON.parse(raw) as PersistedState;
    cachedParsed = parsed?.v === 1 ? parsed : EMPTY;
  } catch {
    cachedParsed = EMPTY;
  }
  return cachedParsed;
}

function write(state: PersistedState) {
  const raw = JSON.stringify(state);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedParsed = state;
  emit();
}

function clearStore() {
  window.localStorage.removeItem(STORAGE_KEY);
  cachedRaw = null;
  cachedParsed = EMPTY;
  emit();
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function withAmounts<T extends { id: string }>(
  lines: T[],
  amounts: Record<string, number> | undefined,
  key: keyof T,
): T[] {
  return lines.map((line) => {
    const next = amounts?.[line.id];
    if (typeof next !== "number" || !Number.isFinite(next)) return line;
    return { ...line, [key]: nonNegative(next) };
  });
}

function defaultStepDone(id: string): boolean {
  for (const goal of alexGoals) {
    const step = goal.steps.find((item) => item.id === id);
    if (step) return step.done;
  }
  return false;
}

interface PortalContextValue {
  role: Role;
  setRole: (role: Role) => void;
  metrics: Metrics;
  roster: RosterRow[];
  expenses: ExpenseLine[];
  streams: PassiveStream[];
  assets: AssetLine[];
  liabilities: LiabilityLine[];
  updateExpense: (id: string, monthly: number) => void;
  updateStream: (id: string, monthly: number) => void;
  updateAsset: (id: string, balance: number) => void;
  updateLiability: (id: string, balance: number) => void;
  toggleStep: (id: string) => void;
  resetDemo: () => void;
  memberById: (id: string) => RosterRow | undefined;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const persisted = useSyncExternalStore(subscribe, readClient, () => EMPTY);

  const value = useMemo<PortalContextValue>(() => {
    const expenses = withAmounts(alexExpenses, persisted.expenses, "monthly");
    const streams = withAmounts(alexStreams, persisted.streams, "monthly");
    const assets = withAmounts(alexAssets, persisted.assets, "balance");
    const liabilities = withAmounts(alexLiabilities, persisted.liabilities, "balance");
    const metrics = totalsFromLines({ expenses, streams, assets, liabilities });
    const roster = buildRoster({
      expenses,
      streams,
      assets,
      liabilities,
      stepOverrides: persisted.steps,
    });

    return {
      role: persisted.role,
      setRole: (role) => write({ ...readClient(), role }),
      metrics,
      roster,
      expenses,
      streams,
      assets,
      liabilities,
      updateExpense: (id, monthly) => {
        const current = readClient();
        write({
          ...current,
          expenses: { ...current.expenses, [id]: nonNegative(monthly) },
        });
      },
      updateStream: (id, monthly) => {
        const current = readClient();
        write({
          ...current,
          streams: { ...current.streams, [id]: nonNegative(monthly) },
        });
      },
      updateAsset: (id, balance) => {
        const current = readClient();
        write({
          ...current,
          assets: { ...current.assets, [id]: nonNegative(balance) },
        });
      },
      updateLiability: (id, balance) => {
        const current = readClient();
        write({
          ...current,
          liabilities: { ...current.liabilities, [id]: nonNegative(balance) },
        });
      },
      toggleStep: (id) => {
        const current = readClient();
        const previous = Object.prototype.hasOwnProperty.call(current.steps, id)
          ? current.steps[id]
          : defaultStepDone(id);
        write({
          ...current,
          steps: { ...current.steps, [id]: !previous },
        });
      },
      resetDemo: clearStore,
      memberById: (id) => roster.find((member) => member.id === id),
    };
  }, [persisted]);

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalContextValue {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortal must be used within PortalProvider");
  }
  return context;
}
