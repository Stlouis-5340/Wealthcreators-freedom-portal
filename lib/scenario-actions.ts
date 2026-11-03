"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  buildForecast,
  buildWhatIf,
  normalizeInputs,
  whatIfPreset,
  type WhatIfId,
} from "@/lib/forecast";
import { ILLUSTRATIVE_YIELD_PERCENT } from "@/lib/gap";
import { totalsFromLines } from "@/lib/metrics";
import { requireMember } from "@/lib/permissions";
import { storedPlanForMember } from "@/lib/plan-store";
import {
  assumptionsFromBundle,
  cleanScenarioName,
  encodeAssumptions,
  encodeOutputs,
} from "@/lib/scenarios";
import { createMemberScenario, deleteMemberScenario, setScenarioShared } from "@/lib/scenario-store";

export interface ScenarioActionResult {
  error: string;
  id: string;
}

function empty(error: string): ScenarioActionResult {
  return { error, id: "" };
}

export async function saveScenarioAction(input: {
  name: string;
  sharedWithGuide: boolean;
  monthlyContribution: number;
  expenseChange: number;
  assumedYieldPercent: number;
  inflationPercent: number;
  presetId: string | null;
}): Promise<ScenarioActionResult> {
  const member = await requireMember();
  if (!member) return empty("Sign in as a member to save a scenario.");
  const plan = await storedPlanForMember(member.id);
  if (!plan) return empty("No plan is on file.");
  const preset = input.presetId ? whatIfPreset(input.presetId) : null;
  if (input.presetId && !preset) return empty("That what-if is not one of the presets.");
  const metrics = totalsFromLines(plan);
  const base = normalizeInputs({
    monthlyPassive: metrics.monthlyPassive,
    monthlyExpenses: metrics.monthlyExpenses,
    monthlyContribution: input.monthlyContribution,
    expenseChange: input.expenseChange,
    addedMonthlyPassive: 0,
    assumedYieldPercent: Number.isFinite(input.assumedYieldPercent)
      ? input.assumedYieldPercent
      : ILLUSTRATIVE_YIELD_PERCENT,
    inflationPercent: input.inflationPercent,
  });
  const bundle = preset ? buildWhatIf(base, preset.id as WhatIfId) : buildForecast(base);
  const name = cleanScenarioName(input.name, preset?.title ?? "Illustrated path");
  const saved = await createMemberScenario({
    memberId: member.id,
    name,
    assumptions: encodeAssumptions(assumptionsFromBundle(bundle, base)),
    outputs: encodeOutputs(bundle),
    sharedWithGuide: input.sharedWithGuide,
  });
  if ("error" in saved) return empty(saved.error);
  if (input.sharedWithGuide) {
    await writeAudit({
      actorUserId: member.id,
      action: "member.share_scenario",
      targetType: "scenario",
      targetId: saved.id,
      meta: { memberId: member.id, shared: true },
    });
  }
  revalidatePath("/forecast");
  revalidatePath(`/guide/${member.id}`);
  return { error: "", id: saved.id };
}

export async function setScenarioShareAction(
  scenarioId: string,
  sharedWithGuide: boolean,
): Promise<ScenarioActionResult> {
  const member = await requireMember();
  if (!member) return empty("Sign in as a member to change sharing.");
  const existing = await prisma.scenarioRun.findFirst({
    where: { id: scenarioId, memberId: member.id },
    select: { id: true, sharedWithGuide: true },
  });
  if (!existing) return empty("That scenario is not on your plan.");
  const updated = await setScenarioShared({
    memberId: member.id,
    scenarioId,
    sharedWithGuide,
  });
  if (!updated) return empty("That scenario is not on your plan.");
  if (existing.sharedWithGuide !== sharedWithGuide) {
    await writeAudit({
      actorUserId: member.id,
      action: sharedWithGuide ? "member.share_scenario" : "member.unshare_scenario",
      targetType: "scenario",
      targetId: scenarioId,
      meta: { memberId: member.id, shared: sharedWithGuide },
    });
  }
  revalidatePath("/forecast");
  revalidatePath(`/guide/${member.id}`);
  return { error: "", id: scenarioId };
}

export async function deleteScenarioAction(scenarioId: string): Promise<ScenarioActionResult> {
  const member = await requireMember();
  if (!member) return empty("Sign in as a member to delete a scenario.");
  const removed = await deleteMemberScenario(member.id, scenarioId);
  if (!removed) return empty("That scenario is not on your plan.");
  revalidatePath("/forecast");
  revalidatePath(`/guide/${member.id}`);
  return { error: "", id: scenarioId };
}
