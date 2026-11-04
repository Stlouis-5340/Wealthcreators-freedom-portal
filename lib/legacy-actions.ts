"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import {
  addBeneficiary,
  addDocument,
  addInsurance,
  removeBeneficiary,
  removeDocument,
  removeInsurance,
  saveChecklistItem,
  saveLegacyProfile,
} from "@/lib/legacy-store";
import {
  parseBeneficiaryDraft,
  parseChecklistDraft,
  parseDocumentDraft,
  parseInsuranceDraft,
  parseProfileDraft,
  recordId,
} from "@/lib/legacy";
import { requireMember } from "@/lib/permissions";

interface LegacyActionResult {
  ok: boolean;
  message: string;
}

function done(): LegacyActionResult {
  return { ok: true, message: "" };
}

function fail(message: string): LegacyActionResult {
  return { ok: false, message };
}

async function memberId(): Promise<string | null> {
  const member = await requireMember();
  return member?.id ?? null;
}

function refresh(id: string) {
  revalidatePath("/legacy");
  revalidatePath(`/guide/${id}`);
}

async function audit(id: string, section: string) {
  await writeAudit({
    actorUserId: id,
    action: "member.update_legacy",
    targetType: "legacy",
    targetId: id,
    meta: { section },
  });
}

export async function saveLegacyProfileAction(input: {
  trustStatus: string;
  trustNotes: string;
  educationGoals: string;
  charitableIntentions: string;
  priorities: string;
}): Promise<LegacyActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to update your legacy notes.");
  const parsed = parseProfileDraft(input);
  if (!parsed.ok) return fail(parsed.message);
  const saved = await saveLegacyProfile(id, parsed.value);
  if (!saved) return fail("Your legacy plan could not be saved.");
  await audit(id, "profile");
  refresh(id);
  return done();
}

export async function saveChecklistItemAction(input: {
  itemId: string;
  status: string;
  questions: string;
}): Promise<LegacyActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to update the checklist.");
  const itemId = recordId(input.itemId);
  if (!itemId) return fail("That checklist item is not on your plan.");
  const parsed = parseChecklistDraft(input);
  if (!parsed.ok) return fail(parsed.message);
  const saved = await saveChecklistItem(id, itemId, parsed.value);
  if (!saved) return fail("That checklist item is not on your plan.");
  await audit(id, "checklist");
  refresh(id);
  return done();
}

export async function addBeneficiaryAction(input: {
  name: string;
  relationship: string;
  role: string;
  notes: string;
}): Promise<LegacyActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to add a beneficiary.");
  const parsed = parseBeneficiaryDraft(input);
  if (!parsed.ok) return fail(parsed.message);
  const created = await addBeneficiary(id, parsed.value);
  if (!created) return fail("The beneficiary list is full. Remove one before adding another.");
  await audit(id, "beneficiary");
  refresh(id);
  return done();
}

export async function removeBeneficiaryAction(beneficiaryId: string): Promise<LegacyActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to update beneficiaries.");
  const target = recordId(beneficiaryId);
  if (!target) return fail("That beneficiary is not on your plan.");
  const removed = await removeBeneficiary(id, target);
  if (!removed) return fail("That beneficiary is not on your plan.");
  await audit(id, "beneficiary");
  refresh(id);
  return done();
}

export async function addInsuranceAction(input: {
  kind: string;
  carrier: string;
  summary: string;
  status: string;
  notes: string;
}): Promise<LegacyActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to update the insurance inventory.");
  const parsed = parseInsuranceDraft(input);
  if (!parsed.ok) return fail(parsed.message);
  const created = await addInsurance(id, parsed.value);
  if (!created) return fail("The insurance inventory is full. Remove one before adding another.");
  await audit(id, "insurance");
  refresh(id);
  return done();
}

export async function removeInsuranceAction(insuranceId: string): Promise<LegacyActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to update the insurance inventory.");
  const target = recordId(insuranceId);
  if (!target) return fail("That coverage summary is not on your plan.");
  const removed = await removeInsurance(id, target);
  if (!removed) return fail("That coverage summary is not on your plan.");
  await audit(id, "insurance");
  refresh(id);
  return done();
}

export async function addDocumentAction(input: {
  title: string;
  kind: string;
  locationNote: string;
  fileName: string;
  notes: string;
}): Promise<LegacyActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to record a document.");
  const parsed = parseDocumentDraft(input);
  if (!parsed.ok) return fail(parsed.message);
  const created = await addDocument(id, parsed.value);
  if (!created) return fail("The document list is full. Remove one before adding another.");
  await audit(id, "document");
  refresh(id);
  return done();
}

export async function removeDocumentAction(documentId: string): Promise<LegacyActionResult> {
  const id = await memberId();
  if (!id) return fail("Sign in as a member to update documents.");
  const target = recordId(documentId);
  if (!target) return fail("That document is not on your plan.");
  const removed = await removeDocument(id, target);
  if (!removed) return fail("That document is not on your plan.");
  await audit(id, "document");
  refresh(id);
  return done();
}
