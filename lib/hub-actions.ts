"use server";

import { revalidatePath } from "next/cache";
import { isTaskStatus, parseTaskDraft } from "@/lib/coaching";
import {
  addAgendaItem,
  addMemberTask,
  addSessionSummary,
  assignedGuide,
  markHubRead,
  postHubMessage,
  setGuideSchedulingUrl,
  setMemberTaskStatus,
} from "@/lib/hub-store";
import { parseAgendaItem, parseHubMessage, parseSchedulingUrl, parseSessionDraft } from "@/lib/hub";
import { guideAssigned } from "@/lib/activity-store";
import { requireGuide, requireMember } from "@/lib/permissions";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function postHubMessageAction(memberId: string, body: string): Promise<ActionResult> {
  const parsed = parseHubMessage(body);
  if (!parsed.ok) return parsed;
  const member = await requireMember();
  if (member) {
    if (member.id !== memberId) return { ok: false, message: "You can only write on your own Guide page." };
    if (!(await assignedGuide(member.id))) {
      return { ok: false, message: "A Wealth Guide is not assigned yet." };
    }
    await postHubMessage({ memberId, authorId: member.id, body: parsed.value });
    refreshHub(memberId);
    return { ok: true };
  }
  const guide = await requireGuide();
  if (!guide) return { ok: false, message: "Sign in to send a note." };
  if (!(await guideAssigned(guide.id, memberId))) {
    return { ok: false, message: "That member is not on your roster." };
  }
  await postHubMessage({ memberId, authorId: guide.id, body: parsed.value });
  refreshHub(memberId);
  return { ok: true };
}

export async function addSessionSummaryAction(
  memberId: string,
  summary: string,
  nextSteps: string,
  heldAt: string,
): Promise<ActionResult> {
  const guide = await requireGuide();
  if (!guide) return { ok: false, message: "Sign in as a Wealth Guide to record a session." };
  const parsed = parseSessionDraft({ summary, nextSteps, heldAt });
  if (!parsed.ok) return parsed;
  const saved = await addSessionSummary({
    memberId,
    guideId: guide.id,
    summary: parsed.value.summary,
    nextSteps: parsed.value.nextSteps,
    heldAt: parsed.value.heldAt,
  });
  if (!saved) return { ok: false, message: "That member is not on your roster." };
  refreshHub(memberId);
  return { ok: true };
}

export async function addAgendaItemAction(body: string): Promise<ActionResult> {
  const member = await requireMember();
  if (!member) return { ok: false, message: "Sign in as a member to propose an agenda item." };
  const parsed = parseAgendaItem(body);
  if (!parsed.ok) return parsed;
  if (!(await assignedGuide(member.id))) {
    return { ok: false, message: "A Wealth Guide is not assigned yet." };
  }
  await addAgendaItem(member.id, parsed.value);
  refreshHub(member.id);
  return { ok: true };
}

export async function addMemberTaskAction(title: string, dueDate: string): Promise<ActionResult> {
  const member = await requireMember();
  if (!member) return { ok: false, message: "Sign in as a member to add an action item." };
  const parsed = parseTaskDraft({ title, dueDate });
  if (!parsed.ok) return parsed;
  const saved = await addMemberTask({
    memberId: member.id,
    title: parsed.value.title,
    dueDate: parsed.value.dueDate,
  });
  if (!saved) return { ok: false, message: "A Wealth Guide is not assigned yet." };
  refreshHub(member.id);
  return { ok: true };
}

export async function setMemberTaskStatusAction(taskId: string, status: string): Promise<ActionResult> {
  const member = await requireMember();
  if (!member) return { ok: false, message: "Sign in as a member to update an action item." };
  if (!isTaskStatus(status)) return { ok: false, message: "An action item is either open or done." };
  const saved = await setMemberTaskStatus({ memberId: member.id, taskId, status });
  if (!saved) return { ok: false, message: "That action item is not on your list." };
  refreshHub(member.id);
  return { ok: true };
}

export async function updateSchedulingUrlAction(url: string): Promise<ActionResult> {
  const guide = await requireGuide();
  if (!guide) return { ok: false, message: "Sign in as a Wealth Guide to save a scheduling link." };
  const parsed = parseSchedulingUrl(url);
  if (!parsed.ok) return parsed;
  const saved = await setGuideSchedulingUrl(guide.id, parsed.value);
  if (!saved) return { ok: false, message: "The scheduling link could not be saved." };
  revalidatePath("/guide");
  return { ok: true };
}

export async function markHubReadAction(memberId: string): Promise<void> {
  const member = await requireMember();
  if (member && member.id === memberId) {
    await markHubRead(member.id, memberId);
    return;
  }
  const guide = await requireGuide();
  if (guide && (await guideAssigned(guide.id, memberId))) {
    await markHubRead(guide.id, memberId);
  }
}

function refreshHub(memberId: string) {
  revalidatePath("/my-guide");
  revalidatePath(`/guide/${memberId}`);
}
