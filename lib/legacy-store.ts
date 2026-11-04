import { guideAssigned } from "@/lib/activity-store";
import { prisma } from "@/lib/db";
import { activeGuideAccess } from "@/lib/grants";
import {
  assembleLegacy,
  checklistCatalog,
  emptyLegacySnapshot,
  isBeneficiaryRole,
  isDocumentKind,
  isInsuranceKind,
  isInsuranceStatus,
  isTrustStatus,
  placeholderStorageKey,
  presentChecklistItem,
  toDocumentView,
  type BeneficiaryDraft,
  type ChecklistDraft,
  type DocumentDraft,
  type InsuranceDraft,
  type LegacyProfileDraft,
  type LegacySnapshot,
} from "@/lib/legacy";
import {
  alexBeneficiaries,
  alexChecklistSeed,
  alexDocuments,
  alexInsurance,
  alexLegacyProfile,
} from "@/lib/sample-legacy";

const beneficiaryCap = 20;
const insuranceCap = 15;
const documentCap = 20;

function checklistRows(memberId: string) {
  return checklistCatalog.map((item) => ({
    id: `${memberId}-legacy-${item.key}`,
    planId: memberId,
    key: item.key,
    area: item.area,
    title: item.title,
    detail: item.detail,
    status: "not_started",
    questions: "",
    sort: item.sort,
  }));
}

const planInclude = {
  checklist: { orderBy: { sort: "asc" as const } },
  beneficiaries: { orderBy: { sort: "asc" as const } },
  insurance: { orderBy: { sort: "asc" as const } },
  documents: { orderBy: [{ recordedAt: "asc" as const }, { title: "asc" as const }] },
};

type PlanRow = NonNullable<Awaited<ReturnType<typeof readPlan>>>;

async function readPlan(memberId: string) {
  return prisma.legacyPlan.findUnique({
    where: { memberId },
    include: planInclude,
  });
}

function snapshotFromPlan(plan: PlanRow): LegacySnapshot {
  const trustStatus = isTrustStatus(plan.trustStatus) ? plan.trustStatus : "not_started";
  const checklist = plan.checklist.flatMap((row) => {
    const view = presentChecklistItem(row);
    return view ? [view] : [];
  });
  const beneficiaries = plan.beneficiaries.flatMap((row) => {
    if (!isBeneficiaryRole(row.role)) return [];
    return [
      {
        id: row.id,
        name: row.name,
        relationship: row.relationship,
        role: row.role,
        notes: row.notes,
      },
    ];
  });
  const insurance = plan.insurance.flatMap((row) => {
    if (!isInsuranceKind(row.kind) || !isInsuranceStatus(row.status)) return [];
    return [
      {
        id: row.id,
        kind: row.kind,
        carrier: row.carrier,
        summary: row.summary,
        status: row.status,
        notes: row.notes,
      },
    ];
  });
  const documents = plan.documents.flatMap((row) => {
    if (!isDocumentKind(row.kind)) return [];
    const view = toDocumentView(row);
    return view ? [view] : [];
  });
  return assembleLegacy({
    profile: {
      trustStatus,
      trustNotes: plan.trustNotes,
      educationGoals: plan.educationGoals,
      charitableIntentions: plan.charitableIntentions,
      priorities: plan.priorities,
      updatedAt: plan.updatedAt.toISOString(),
    },
    checklist,
    beneficiaries,
    insurance,
    documents,
  });
}

export async function ensureLegacyPlan(memberId: string): Promise<void> {
  await prisma.legacyPlan.upsert({
    where: { memberId },
    create: {
      memberId,
      checklist: {
        create: checklistRows(memberId).map((row) => ({
          id: row.id,
          key: row.key,
          area: row.area,
          title: row.title,
          detail: row.detail,
          status: row.status,
          questions: row.questions,
          sort: row.sort,
        })),
      },
    },
    update: {},
  });
  const existing = await prisma.legacyChecklistItem.findMany({
    where: { planId: memberId },
    select: { key: true },
  });
  const have = new Set(existing.map((row) => row.key));
  const missing = checklistRows(memberId).filter((row) => !have.has(row.key));
  if (missing.length === 0) return;
  await prisma.legacyChecklistItem.createMany({ data: missing });
}

export async function loadMemberLegacy(memberId: string): Promise<LegacySnapshot> {
  await ensureLegacyPlan(memberId);
  const plan = await readPlan(memberId);
  return plan ? snapshotFromPlan(plan) : emptyLegacySnapshot();
}

export async function saveLegacyProfile(memberId: string, draft: LegacyProfileDraft): Promise<boolean> {
  await ensureLegacyPlan(memberId);
  const saved = await prisma.legacyPlan.updateMany({
    where: { memberId },
    data: draft,
  });
  return saved.count === 1;
}

export async function saveChecklistItem(
  memberId: string,
  itemId: string,
  draft: ChecklistDraft,
): Promise<boolean> {
  await ensureLegacyPlan(memberId);
  const saved = await prisma.legacyChecklistItem.updateMany({
    where: { id: itemId, planId: memberId },
    data: draft,
  });
  return saved.count === 1;
}

export async function addBeneficiary(memberId: string, draft: BeneficiaryDraft): Promise<string | null> {
  await ensureLegacyPlan(memberId);
  const count = await prisma.legacyBeneficiary.count({ where: { planId: memberId } });
  if (count >= beneficiaryCap) return null;
  const last = await prisma.legacyBeneficiary.aggregate({
    where: { planId: memberId },
    _max: { sort: true },
  });
  const created = await prisma.legacyBeneficiary.create({
    data: {
      planId: memberId,
      ...draft,
      sort: (last._max.sort ?? -1) + 1,
    },
    select: { id: true },
  });
  return created.id;
}

export async function removeBeneficiary(memberId: string, id: string): Promise<boolean> {
  const removed = await prisma.legacyBeneficiary.deleteMany({ where: { id, planId: memberId } });
  return removed.count === 1;
}

export async function addInsurance(memberId: string, draft: InsuranceDraft): Promise<string | null> {
  await ensureLegacyPlan(memberId);
  const count = await prisma.legacyInsurance.count({ where: { planId: memberId } });
  if (count >= insuranceCap) return null;
  const last = await prisma.legacyInsurance.aggregate({
    where: { planId: memberId },
    _max: { sort: true },
  });
  const created = await prisma.legacyInsurance.create({
    data: {
      planId: memberId,
      ...draft,
      sort: (last._max.sort ?? -1) + 1,
    },
    select: { id: true },
  });
  return created.id;
}

export async function removeInsurance(memberId: string, id: string): Promise<boolean> {
  const removed = await prisma.legacyInsurance.deleteMany({ where: { id, planId: memberId } });
  return removed.count === 1;
}

export async function addDocument(memberId: string, draft: DocumentDraft): Promise<string | null> {
  await ensureLegacyPlan(memberId);
  const count = await prisma.legacyDocument.count({ where: { planId: memberId } });
  if (count >= documentCap) return null;
  const created = await prisma.legacyDocument.create({
    data: {
      planId: memberId,
      title: draft.title,
      kind: draft.kind,
      locationNote: draft.locationNote,
      fileName: draft.fileName,
      notes: draft.notes,
      storageKey: "",
    },
    select: { id: true },
  });
  const storageKey = placeholderStorageKey(memberId, created.id, draft.fileName);
  if (storageKey) {
    await prisma.legacyDocument.update({
      where: { id: created.id },
      data: { storageKey },
    });
  }
  return created.id;
}

export async function removeDocument(memberId: string, id: string): Promise<boolean> {
  const removed = await prisma.legacyDocument.deleteMany({ where: { id, planId: memberId } });
  return removed.count === 1;
}

export type GuideLegacyPayload =
  | { shared: false }
  | { shared: true; view: LegacySnapshot };

/** Assigned guides only. Private plans are not loaded. */
export async function loadGuideLegacy(guideId: string, memberId: string): Promise<GuideLegacyPayload | null> {
  if (!(await guideAssigned(guideId, memberId))) return null;
  const access = await activeGuideAccess(guideId, memberId);
  if (!access?.legacy) return { shared: false };
  const plan = await readPlan(memberId);
  return { shared: true, view: plan ? snapshotFromPlan(plan) : emptyLegacySnapshot() };
}

async function applyAlexLegacy(): Promise<void> {
  await prisma.legacyPlan.update({
    where: { memberId: "alex" },
    data: alexLegacyProfile,
  });
  for (const [key, value] of Object.entries(alexChecklistSeed)) {
    await prisma.legacyChecklistItem.updateMany({
      where: { planId: "alex", key },
      data: { status: value.status, questions: value.questions },
    });
  }
  await prisma.legacyBeneficiary.deleteMany({ where: { planId: "alex" } });
  await prisma.legacyInsurance.deleteMany({ where: { planId: "alex" } });
  await prisma.legacyDocument.deleteMany({ where: { planId: "alex" } });
  await prisma.legacyBeneficiary.createMany({
    data: alexBeneficiaries.map((row) => ({ ...row, planId: "alex" })),
  });
  await prisma.legacyInsurance.createMany({
    data: alexInsurance.map((row) => ({ ...row, planId: "alex" })),
  });
  await prisma.legacyDocument.createMany({
    data: alexDocuments.map((row, index) => ({
      ...row,
      planId: "alex",
      recordedAt: new Date(Date.UTC(2026, 9, 20 + index, 15, 0, 0)),
    })),
  });
}

export async function resetLegacyForMembers(memberIds: string[]): Promise<void> {
  if (memberIds.length === 0) return;
  await prisma.legacyPlan.deleteMany({ where: { memberId: { in: memberIds } } });
  for (const memberId of memberIds) {
    await ensureLegacyPlan(memberId);
  }
  if (memberIds.includes("alex")) await applyAlexLegacy();
}
