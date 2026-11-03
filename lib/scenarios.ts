/**
 * Saved forecast runs.
 *
 * assumptions and outputs are JSON the server builds. Guides see a run only when
 * sharedWithGuide is true, the Guide is assigned, and the member's scopes allow it.
 * Bank names and tokens are not part of the payload. Guide text drops them if they appear.
 */

import type { GuideAccess } from "@/lib/access";
import {
  FORECAST_HORIZON_MONTHS,
  MILESTONES,
  rangeText,
  type ForecastBundle,
  type ForecastInputs,
  type MilestoneRange,
  type ScenarioId,
  type WhatIfId,
} from "@/lib/forecast";

export interface ScenarioAssumptions {
  version: 1;
  kind: "forecast" | "what-if";
  presetId: WhatIfId | null;
  /** What the member typed, before a what-if preset. */
  baseInputs: ForecastInputs;
  /** Inputs of the path that was saved, after a preset when there is one. */
  inputs: ForecastInputs;
}

export interface MemberScenarioSummary {
  id: string;
  name: string;
  kind: "forecast" | "what-if";
  presetId: string | null;
  sharedWithGuide: boolean;
  updatedAt: string;
}

export interface GuideScenarioCard {
  id: string;
  name: string;
  updatedAt: string;
  kindLabel: string;
  statements: string[];
  ranges: { threshold: string; text: string }[];
  hiddenNote: string;
}

const blockedText = /access[_-]?token|passwordHash|vanguard|fidelity|treasurydirect|\bplaid\b/i;

export function cleanScenarioName(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned || fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function assumptionsFromBundle(bundle: ForecastBundle, baseInputs: ForecastInputs): ScenarioAssumptions {
  const focus = bundle.scenarios.find((scenario) => scenario.id === (bundle.kind === "what-if" ? "what-if" : "current"));
  return {
    version: 1,
    kind: bundle.kind,
    presetId: bundle.presetId,
    baseInputs,
    inputs: focus?.inputs ?? baseInputs,
  };
}

export function encodeAssumptions(value: ScenarioAssumptions): string {
  return JSON.stringify(value);
}

export function encodeOutputs(bundle: ForecastBundle): string {
  return JSON.stringify({
    version: 1,
    asOf: bundle.asOf,
    horizonMonths: bundle.horizonMonths,
    statements: bundle.statements,
    scenarios: bundle.scenarios,
    ranges: bundle.ranges,
  });
}

function guideSafe(value: string, fallback: string): string | null {
  const cleaned = value.replace(/[\u0000-\u001F]/g, " ").trim();
  if (!cleaned || blockedText.test(cleaned)) return fallback ? fallback : null;
  return cleaned;
}

export function presentScenarioForGuide(
  row: { id: string; name: string; updatedAt: string; assumptions: string; outputs: string },
  access: Pick<GuideAccess, "score" | "totals">,
): GuideScenarioCard | null {
  let assumptions: unknown;
  let outputs: unknown;
  try {
    assumptions = JSON.parse(row.assumptions);
    outputs = JSON.parse(row.outputs);
  } catch {
    return null;
  }
  if (!isRecord(assumptions) || assumptions.version !== 1 || !isRecord(outputs) || outputs.version !== 1) {
    return null;
  }
  const kind = assumptions.kind === "what-if" ? "what-if" : assumptions.kind === "forecast" ? "forecast" : null;
  if (!kind) return null;
  const statements = Array.isArray(outputs.statements)
    ? outputs.statements.flatMap((item) => {
        if (typeof item !== "string") return [];
        if (!access.totals && item.includes("$")) return [];
        const safe = guideSafe(item, "");
        return safe ? [safe] : [];
      })
    : [];
  const ranges =
    access.score && Array.isArray(outputs.ranges)
      ? outputs.ranges.flatMap((item) => {
          const range = readRange(item);
          if (!range) return [];
          const text = guideSafe(rangeText(range), "");
          if (!text || (!access.totals && text.includes("$"))) return [];
          return [{ threshold: `${range.threshold}%`, text }];
        })
      : [];
  const notes: string[] = [];
  if (!access.score) notes.push("Freedom Score dates stay hidden because the score is not shared.");
  if (!access.totals) notes.push("Dollar amounts stay hidden because totals are not shared.");
  if (access.score && access.totals) {
    notes.push("Shared by the member. Bank names and account numbers are not part of this scenario.");
  }
  return {
    id: row.id,
    name: guideSafe(row.name, "Shared scenario") ?? "Shared scenario",
    updatedAt: row.updatedAt,
    kindLabel: kind === "what-if" ? "What-if" : "Three paths",
    statements,
    ranges,
    hiddenNote: notes.join(" "),
  };
}

function readRange(value: unknown): MilestoneRange | null {
  if (!isRecord(value)) return null;
  const threshold = numberField(value.threshold);
  if (threshold == null || !MILESTONES.includes(threshold as (typeof MILESTONES)[number])) return null;
  if (!Array.isArray(value.hits) || !Array.isArray(value.misses)) return null;
  const hits = value.hits.flatMap((hit) => {
    if (!isRecord(hit)) return [];
    const monthIndex = numberField(hit.monthIndex);
    const date = typeof hit.date === "string" ? hit.date : "";
    const label = typeof hit.label === "string" ? hit.label : "";
    const scenarioId = scenarioIdOf(hit.scenarioId);
    if (
      monthIndex == null ||
      monthIndex < 0 ||
      monthIndex > FORECAST_HORIZON_MONTHS ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !scenarioId
    ) {
      return [];
    }
    const safeLabel = guideSafe(label, "Path");
    if (!safeLabel) return [];
    return [
      {
        scenarioId,
        label: safeLabel,
        monthIndex,
        date,
        fallsBack: hit.fallsBack === true,
      },
    ];
  });
  const misses = value.misses.flatMap((miss) => {
    if (!isRecord(miss)) return [];
    const scenarioId = scenarioIdOf(miss.scenarioId);
    const label = typeof miss.label === "string" ? miss.label : "";
    if (!scenarioId) return [];
    const safeLabel = guideSafe(label, "Path");
    if (!safeLabel) return [];
    return [{ scenarioId, label: safeLabel }];
  });
  const earliest = edge(value.earliest);
  const latest = edge(value.latest);
  return { threshold, hits, misses, earliest, latest };
}

function scenarioIdOf(value: unknown): ScenarioId | null {
  if (value === "conservative" || value === "current" || value === "accelerated" || value === "what-if") {
    return value;
  }
  return null;
}

function edge(value: unknown): { label: string; monthIndex: number; date: string } | null {
  if (!isRecord(value)) return null;
  const monthIndex = numberField(value.monthIndex);
  const date = typeof value.date === "string" ? value.date : "";
  const label = typeof value.label === "string" ? value.label : "";
  if (monthIndex == null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const safeLabel = guideSafe(label, "Path");
  if (!safeLabel) return null;
  return { label: safeLabel, monthIndex, date };
}

export function summaryKind(assumptions: string): { kind: "forecast" | "what-if"; presetId: string | null } {
  try {
    const value = JSON.parse(assumptions) as unknown;
    if (!isRecord(value)) return { kind: "forecast", presetId: null };
    return {
      kind: value.kind === "what-if" ? "what-if" : "forecast",
      presetId: typeof value.presetId === "string" ? value.presetId : null,
    };
  } catch {
    return { kind: "forecast", presetId: null };
  }
}

export function bundleHasInstitutionLeak(bundle: ForecastBundle, institutions: string[]): boolean {
  const payload = JSON.stringify(bundle).toLowerCase();
  return institutions.some((name) => name && payload.includes(name.toLowerCase()));
}
