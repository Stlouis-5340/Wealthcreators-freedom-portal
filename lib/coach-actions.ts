"use server";

import { revalidatePath } from "next/cache";
import { generateText, Output } from "ai";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { coachConfigured, coachModel } from "@/lib/coach-config";
import { COACH_DISCLAIMER, COACH_SYSTEM_RULES, parseFreedomActions } from "@/lib/coach-plan";
import { loadCoachPrompt, saveFreedomPlan } from "@/lib/coach-store";
import { chicagoMonthKey } from "@/lib/month";
import { requireMember } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export interface PlanFormState {
  error: string;
  saved: boolean;
}

const actionSchema = z.object({
  actions: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        impact: z.string(),
        difficulty: z.enum(["Light", "Moderate", "Heavy"]),
        timeline: z.string(),
        goalLink: z.string(),
      }),
    )
    .length(3),
});

export async function generateFreedomPlanAction(
  _previous: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const member = await requireMember();
  if (!member) return { error: "Sign in as a member to write a plan.", saved: false };
  if (!coachConfigured()) {
    return {
      error: "The coach is not connected, so a new plan cannot be written. A saved plan still shows.",
      saved: false,
    };
  }
  const model = coachModel();
  if (!model) {
    return { error: "The coach model is not set, so a new plan cannot be written.", saved: false };
  }

  const monthKey = chicagoMonthKey();
  const intent = String(formData.get("intent") ?? "generate");
  const existing = await prisma.freedomActionPlan.findUnique({
    where: { memberId_monthKey: { memberId: member.id, monthKey } },
    select: { regeneratedAt: true },
  });
  const regenerate = intent === "regenerate" && Boolean(existing);
  if (regenerate && existing?.regeneratedAt) {
    return {
      error: "This month's plan was already refreshed. The next plan opens with the new month. The conversation is unchanged.",
      saved: false,
    };
  }
  if (!regenerate && existing) {
    return { error: "", saved: true };
  }

  const context = await loadCoachPrompt(member.id, monthKey);
  if (!context) return { error: "Your plan is not available yet.", saved: false };

  let actions;
  try {
    const result = await generateText({
      model,
      system: COACH_SYSTEM_RULES,
      output: Output.object({ schema: actionSchema }),
      prompt: [
        "Write this member's Freedom Action Plan for the current month.",
        "Return exactly three priority actions.",
        "Each action needs a short title, a detail grounded in the context, the potential impact, a difficulty of Light, Moderate, or Heavy, a timeline, and the goal it relates to.",
        "Educational guidance only. Do not promise a return. Do not name a product, a bank, or an allocation.",
        regenerate
          ? "The member asked to refresh the plan. Keep it useful and do not repeat the same three titles if the context supports a different emphasis."
          : "This is the first plan for the month.",
        COACH_DISCLAIMER,
        context,
      ].join("\n\n"),
    });
    actions = parseFreedomActions(result.output);
  } catch (error) {
    console.error("Freedom Action Plan generation failed", error instanceof Error ? error.name : "error");
    return {
      error: "The coach could not write a plan just now. A saved plan, if you have one, is unchanged.",
      saved: false,
    };
  }
  if (!actions) {
    return { error: "The coach returned a plan that did not fit the three-action shape. Nothing was saved.", saved: false };
  }

  const saved = await saveFreedomPlan({
    memberId: member.id,
    monthKey,
    actions,
    regenerate,
  });
  if (!saved) return { error: "The plan could not be saved.", saved: false };
  try {
    await writeAudit({
      actorUserId: member.id,
      action: regenerate ? "member.regenerate_action_plan" : "member.generate_action_plan",
      targetType: "action_plan",
      targetId: saved.id,
      meta: { monthKey, regenerated: regenerate },
    });
  } catch {
    // The plan is saved even if the audit row cannot be written.
  }
  revalidatePath("/coach");
  return { error: "", saved: true };
}
