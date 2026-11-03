"use server";

import {
  addCoachingNote,
  addCoachingTask,
  saveMemberCheckIn,
  setCoachingTaskStatus,
} from "@/lib/activity-store";
import { parseCheckInDraft, type CheckInDraft } from "@/lib/check-in";
import { isTaskStatus, parseNoteBody, parseTaskDraft } from "@/lib/coaching";
import { requireGuide, requireMember } from "@/lib/permissions";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function saveWeeklyCheckInAction(draft: CheckInDraft): Promise<ActionResult> {
  const user = await requireMember();
  if (!user) {
    return { ok: false, message: "Sign in as a member to save a check-in." };
  }
  const parsed = parseCheckInDraft(draft);
  if (!parsed.ok) return parsed;
  const saved = await saveMemberCheckIn(user.id, parsed.value);
  if (!saved) return { ok: false, message: "This check-in could not be saved." };
  return { ok: true };
}

export async function addCoachingNoteAction(memberId: string, body: string): Promise<ActionResult> {
  const guide = await guideSession();
  if (!guide) return { ok: false, message: "Sign in as a Wealth Guide to add a note." };
  const parsed = parseNoteBody(body);
  if (!parsed.ok) return parsed;
  const note = await addCoachingNote({
    guideId: guide.id,
    guideName: guide.name ?? "Wealth Guide",
    memberId,
    body: parsed.value,
  });
  if (!note) return { ok: false, message: "That member is not on your roster." };
  return { ok: true };
}

export async function addCoachingTaskAction(
  memberId: string,
  title: string,
  dueDate: string,
): Promise<ActionResult> {
  const guide = await guideSession();
  if (!guide) return { ok: false, message: "Sign in as a Wealth Guide to assign a task." };
  const parsed = parseTaskDraft({ title, dueDate });
  if (!parsed.ok) return parsed;
  const task = await addCoachingTask({
    guideId: guide.id,
    memberId,
    title: parsed.value.title,
    dueDate: parsed.value.dueDate,
  });
  if (!task) return { ok: false, message: "That member is not on your roster." };
  return { ok: true };
}

export async function setCoachingTaskStatusAction(
  taskId: string,
  status: string,
): Promise<ActionResult> {
  const guide = await guideSession();
  if (!guide) return { ok: false, message: "Sign in as a Wealth Guide to update a task." };
  if (!isTaskStatus(status)) return { ok: false, message: "A task is either open or done." };
  const updated = await setCoachingTaskStatus({ guideId: guide.id, taskId, status });
  if (!updated) return { ok: false, message: "That task is not on your roster." };
  return { ok: true };
}

async function guideSession() {
  return requireGuide();
}
