"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import {
  abandonEnrollment,
  addGroupMember,
  createGroup,
  enrollMember,
  leaveGroup,
  saveMemberLife,
  setAchievementVisibility,
  setChecklistItem,
} from "@/lib/community-store";
import { parseLifeDraft } from "@/lib/life";
import { requireMember } from "@/lib/permissions";

interface CommunityActionResult {
  ok: boolean;
  message: string;
}

function done(): CommunityActionResult {
  return { ok: true, message: "" };
}

function fail(message: string): CommunityActionResult {
  return { ok: false, message };
}

async function memberId(): Promise<string | null> {
  const member = await requireMember();
  return member?.id ?? null;
}

function refresh(memberIdValue: string) {
  revalidatePath("/challenges");
  revalidatePath("/recognition");
  revalidatePath("/life");
  revalidatePath(`/guide/${memberIdValue}`);
}

export async function enrollChallengeAction(challengeId: string): Promise<CommunityActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to enroll.");
  const result = await enrollMember(id, challengeId);
  if (!result.ok) return result;
  refresh(id);
  return done();
}

export async function abandonChallengeAction(enrollmentId: string): Promise<CommunityActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to update a challenge.");
  const result = await abandonEnrollment(id, enrollmentId);
  if (!result.ok) return result;
  refresh(id);
  return done();
}

export async function setChecklistAction(
  enrollmentId: string,
  key: string,
  doneItem: boolean,
): Promise<CommunityActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to update a challenge.");
  const result = await setChecklistItem(id, enrollmentId, key, doneItem);
  if (!result.ok) return result;
  refresh(id);
  revalidatePath("/recognition");
  return done();
}

export async function createGroupAction(challengeId: string, name: string): Promise<CommunityActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to start a circle.");
  const result = await createGroup(id, challengeId, name);
  if (!result.ok) return result;
  refresh(id);
  return done();
}

export async function addGroupMemberAction(groupId: string, email: string): Promise<CommunityActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to add someone.");
  const result = await addGroupMember(id, groupId, email);
  if (!result.ok) return result;
  refresh(id);
  return done();
}

export async function leaveGroupAction(groupId: string): Promise<CommunityActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to leave a circle.");
  const result = await leaveGroup(id, groupId);
  if (!result.ok) return result;
  refresh(id);
  return done();
}

export async function setAchievementVisibilityAction(
  key: string,
  visibility: "private" | "guide",
): Promise<CommunityActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to change visibility.");
  if (visibility !== "private" && visibility !== "guide") return fail("Choose private or shared with your Guide.");
  const result = await setAchievementVisibility(id, key, visibility);
  if (!result.ok) return result;
  await writeAudit({
    actorUserId: id,
    action: visibility === "guide" ? "member.share_achievement" : "member.hide_achievement",
    targetType: "achievement",
    targetId: key,
    meta: { memberId: id, visibility },
  });
  refresh(id);
  return done();
}

export async function saveLifeAction(input: {
  timeFreedomHours: string;
  familyPriority: string;
  healthStreakDays: string;
  experiencesPlanned: string;
}): Promise<CommunityActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to save life measures.");
  const parsed = parseLifeDraft(input);
  if (!parsed.ok) return fail(parsed.message);
  await saveMemberLife(id, parsed.value);
  refresh(id);
  return done();
}
