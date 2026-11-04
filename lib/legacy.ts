/**
 * Legacy planner. Educational notes for a qualified professional.
 * This module does not give legal, tax, or insurance advice.
 * There is no SSN field. Document bytes are not stored.
 */

export const LEGACY_DISCLAIMER =
  "This is an educational organizer for your own notes. It is not legal, tax, insurance, or financial advice, and it does not create or replace a will, trust, beneficiary form, or insurance policy. Use it to see open steps and to write questions for a qualified attorney, tax professional, or advisor. Do not enter Social Security numbers, account numbers, or policy numbers. Document files are not uploaded in this version.";

export const SENSITIVE_MESSAGE =
  "Leave out Social Security numbers, account numbers, and policy numbers. This page stores names and short summaries only.";

export const checklistStatuses = ["not_started", "in_progress", "done", "na"] as const;
export type ChecklistStatus = (typeof checklistStatuses)[number];

export const trustStatuses = ["not_started", "exploring", "drafted", "signed", "funded", "reviewing", "na"] as const;
export type TrustStatus = (typeof trustStatuses)[number];

export const beneficiaryRoles = ["primary", "contingent"] as const;
export type BeneficiaryRole = (typeof beneficiaryRoles)[number];

export const insuranceKinds = ["life", "disability", "long_term_care", "property", "umbrella", "health", "other"] as const;
export type InsuranceKind = (typeof insuranceKinds)[number];

export const insuranceStatuses = ["in_force", "reviewing", "none", "unknown"] as const;
export type InsuranceStatus = (typeof insuranceStatuses)[number];

export const documentKinds = ["will", "trust", "insurance", "tax", "directive", "letter", "other"] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const legacyAreas = [
  { id: "estate", label: "Estate planning" },
  { id: "trust", label: "Trust planning" },
  { id: "protection", label: "Insurance" },
  { id: "documents", label: "Documents" },
  { id: "education", label: "Family wealth education" },
  { id: "giving", label: "Charitable giving" },
  { id: "priorities", label: "Legacy priorities" },
] as const;

export type LegacyArea = (typeof legacyAreas)[number]["id"];

export const checklistStatusLabels: Record<ChecklistStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
  na: "N/A",
};

export const trustStatusLabels: Record<TrustStatus, string> = {
  not_started: "Not started",
  exploring: "Exploring",
  drafted: "Draft written",
  signed: "Signed",
  funded: "Funded",
  reviewing: "Reviewing with a professional",
  na: "Not applicable",
};

export const beneficiaryRoleLabels: Record<BeneficiaryRole, string> = {
  primary: "Primary",
  contingent: "Contingent",
};

export const insuranceKindLabels: Record<InsuranceKind, string> = {
  life: "Life",
  disability: "Disability",
  long_term_care: "Long-term care",
  property: "Property",
  umbrella: "Umbrella",
  health: "Health",
  other: "Other",
};

export const insuranceStatusLabels: Record<InsuranceStatus, string> = {
  in_force: "In force",
  reviewing: "Reviewing",
  none: "None",
  unknown: "Unknown",
};

export const documentKindLabels: Record<DocumentKind, string> = {
  will: "Will",
  trust: "Trust",
  insurance: "Insurance",
  tax: "Tax",
  directive: "Directive",
  letter: "Letter of instruction",
  other: "Other",
};

export interface ChecklistTemplate {
  key: string;
  area: LegacyArea;
  title: string;
  detail: string;
  ask: string;
  sort: number;
}

export const checklistCatalog: ChecklistTemplate[] = [
  {
    key: "will-reviewed",
    area: "estate",
    title: "Will reviewed with an attorney",
    detail: "Note whether a current will exists and when a professional last looked at it.",
    ask: "What do I already have, and what is out of date?",
    sort: 0,
  },
  {
    key: "powers-of-attorney",
    area: "estate",
    title: "Powers of attorney named",
    detail: "Financial and healthcare powers of attorney are separate documents in many states.",
    ask: "Who should be able to act for me, and who is the backup?",
    sort: 1,
  },
  {
    key: "healthcare-directive",
    area: "estate",
    title: "Healthcare directive noted",
    detail: "A living will or healthcare directive says what care you want if you cannot speak for yourself.",
    ask: "Does my healthcare directive match what I would want today?",
    sort: 2,
  },
  {
    key: "beneficiary-designations",
    area: "estate",
    title: "Beneficiary designations reviewed",
    detail: "Account forms can override a will. This is a reminder to ask, not a form to file here.",
    ask: "Which account forms should name a person, and which should wait for an attorney?",
    sort: 3,
  },
  {
    key: "guardians",
    area: "estate",
    title: "Guardian plan for minor children",
    detail: "If this does not apply, mark it N/A. Otherwise note that the choice is still open.",
    ask: "Who should be guardian, and who is the backup if they cannot serve?",
    sort: 4,
  },
  {
    key: "trust-decision",
    area: "trust",
    title: "Trust planning status recorded",
    detail: "Record whether you are exploring a trust, have one, or have decided to wait. The portal does not choose for you.",
    ask: "Is a trust the right tool for what I own, or is another document enough?",
    sort: 5,
  },
  {
    key: "life-insurance-inventory",
    area: "protection",
    title: "Life insurance summarized",
    detail: "A carrier name and a plain-language summary. Leave the policy number in the folder at home.",
    ask: "What life coverage is in force, and what should an insurance professional review?",
    sort: 6,
  },
  {
    key: "liability-coverage",
    area: "protection",
    title: "Property and liability coverage summarized",
    detail: "Home, rental, and umbrella policies belong here as summaries, not as policy numbers.",
    ask: "Are the liability limits still right for the property I own?",
    sort: 7,
  },
  {
    key: "document-list",
    area: "documents",
    title: "Important documents located",
    detail: "List titles and where the originals are kept so a trusted person can find them.",
    ask: "Who else should know where these documents are, and what should stay private?",
    sort: 8,
  },
  {
    key: "family-education",
    area: "education",
    title: "Family wealth education goals written",
    detail: "What you want the family to understand. Not account balances.",
    ask: "What is age-appropriate to explain, and what belongs in a meeting with a professional?",
    sort: 9,
  },
  {
    key: "charitable-intent",
    area: "giving",
    title: "Charitable giving intentions written",
    detail: "Annual gifts, a bequest, or a decision to wait. Nothing here is a pledge.",
    ask: "If I want to give, what should I ask a tax professional about?",
    sort: 10,
  },
  {
    key: "legacy-priorities",
    area: "priorities",
    title: "Legacy priorities written in your words",
    detail: "The outcomes you care about, before the documents get technical.",
    ask: "What has to be true for the people I love, and what can wait?",
    sort: 11,
  },
];

export interface LegacyProfile {
  trustStatus: TrustStatus;
  trustNotes: string;
  educationGoals: string;
  charitableIntentions: string;
  priorities: string;
  updatedAt: string | null;
}

export interface ChecklistItemView {
  id: string;
  key: string;
  area: LegacyArea;
  title: string;
  detail: string;
  ask: string;
  status: ChecklistStatus;
  questions: string;
  sort: number;
}

export interface BeneficiaryView {
  id: string;
  name: string;
  relationship: string;
  role: BeneficiaryRole;
  notes: string;
}

export interface InsuranceView {
  id: string;
  kind: InsuranceKind;
  carrier: string;
  summary: string;
  status: InsuranceStatus;
  notes: string;
}

/** Document metadata for the page. storageKey stays on the server. */
export interface DocumentView {
  id: string;
  title: string;
  kind: DocumentKind;
  locationNote: string;
  fileName: string;
  pendingUpload: boolean;
  notes: string;
}

export interface LegacyGap {
  id: string;
  title: string;
  detail: string;
  question: string;
}

export interface LegacySnapshot {
  profile: LegacyProfile;
  checklist: ChecklistItemView[];
  beneficiaries: BeneficiaryView[];
  insurance: InsuranceView[];
  documents: DocumentView[];
  gaps: LegacyGap[];
}

export interface LegacyProfileDraft {
  trustStatus: TrustStatus;
  trustNotes: string;
  educationGoals: string;
  charitableIntentions: string;
  priorities: string;
}

export interface ChecklistDraft {
  status: ChecklistStatus;
  questions: string;
}

export interface BeneficiaryDraft {
  name: string;
  relationship: string;
  role: BeneficiaryRole;
  notes: string;
}

export interface InsuranceDraft {
  kind: InsuranceKind;
  carrier: string;
  summary: string;
  status: InsuranceStatus;
  notes: string;
}

export interface DocumentDraft {
  title: string;
  kind: DocumentKind;
  locationNote: string;
  fileName: string;
  notes: string;
}

const emptyProfile: LegacyProfile = {
  trustStatus: "not_started",
  trustNotes: "",
  educationGoals: "",
  charitableIntentions: "",
  priorities: "",
  updatedAt: null,
};

export function templateByKey(key: string): ChecklistTemplate | undefined {
  return checklistCatalog.find((item) => item.key === key);
}

export function isChecklistStatus(value: string): value is ChecklistStatus {
  return (checklistStatuses as readonly string[]).includes(value);
}

export function isTrustStatus(value: string): value is TrustStatus {
  return (trustStatuses as readonly string[]).includes(value);
}

export function isBeneficiaryRole(value: string): value is BeneficiaryRole {
  return (beneficiaryRoles as readonly string[]).includes(value);
}

export function isInsuranceKind(value: string): value is InsuranceKind {
  return (insuranceKinds as readonly string[]).includes(value);
}

export function isInsuranceStatus(value: string): value is InsuranceStatus {
  return (insuranceStatuses as readonly string[]).includes(value);
}

export function isDocumentKind(value: string): value is DocumentKind {
  return (documentKinds as readonly string[]).includes(value);
}

export function isLegacyArea(value: string): value is LegacyArea {
  return legacyAreas.some((area) => area.id === value);
}

export function cleanLegacyText(value: unknown, max: number): string {
  const raw = typeof value === "string" ? value : "";
  return raw.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

const ssnDashed = /\b\d{3}-\d{2}-\d{4}\b/;
const ssnPlain = /\b\d{9}\b/;
const labeledId = /\b(?:ssn|social security(?: number)?|tax id|ein)\b/i;

/** Reject government IDs, account numbers, and policy-number-length digit runs. */
export function containsSensitiveId(value: string): boolean {
  if (ssnDashed.test(value) || ssnPlain.test(value)) return true;
  if (labeledId.test(value) && /\d{3,}/.test(value)) return true;
  const digits = value.replace(/[^\d]/g, "");
  return /\d{12,}/.test(digits);
}

export function sensitiveMessage(parts: string[]): string | null {
  return parts.some((part) => containsSensitiveId(part)) ? SENSITIVE_MESSAGE : null;
}

/**
 * Private placeholder path. File bytes are not stored.
 * TODO: when BLOB_READ_WRITE_TOKEN is set, upload with private access and store only that pathname.
 * Do not store a public URL or the token.
 */
export function placeholderStorageKey(memberId: string, documentId: string, fileName: string): string {
  const safeMember = memberId.replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
  const safeId = documentId.replace(/[^a-z0-9_-]/gi, "").slice(0, 80);
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const safeFile = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!safeMember || !safeId || !safeFile || safeFile === "." || safeFile === "..") return "";
  const key = `legacy/${safeMember}/${safeId}/${safeFile}`;
  if (key.startsWith("http") || key.includes("://")) return "";
  return key;
}

export function recordId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(value)) return null;
  return value;
}

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

export function parseProfileDraft(input: {
  trustStatus: unknown;
  trustNotes: unknown;
  educationGoals: unknown;
  charitableIntentions: unknown;
  priorities: unknown;
}): { ok: true; value: LegacyProfileDraft } | { ok: false; message: string } {
  const trustStatus = typeof input.trustStatus === "string" ? input.trustStatus : "";
  if (!isTrustStatus(trustStatus)) return fail("Choose a trust planning status.");
  const trustNotes = cleanLegacyText(input.trustNotes, 600);
  const educationGoals = cleanLegacyText(input.educationGoals, 600);
  const charitableIntentions = cleanLegacyText(input.charitableIntentions, 600);
  const priorities = cleanLegacyText(input.priorities, 600);
  const sensitive = sensitiveMessage([trustNotes, educationGoals, charitableIntentions, priorities]);
  if (sensitive) return fail(sensitive);
  return { ok: true, value: { trustStatus, trustNotes, educationGoals, charitableIntentions, priorities } };
}

export function parseChecklistDraft(input: {
  status: unknown;
  questions: unknown;
}): { ok: true; value: ChecklistDraft } | { ok: false; message: string } {
  const status = typeof input.status === "string" ? input.status : "";
  if (!isChecklistStatus(status)) return fail("Choose not started, in progress, done, or N/A.");
  const questions = cleanLegacyText(input.questions, 500);
  const sensitive = sensitiveMessage([questions]);
  if (sensitive) return fail(sensitive);
  return { ok: true, value: { status, questions } };
}

export function parseBeneficiaryDraft(input: {
  name: unknown;
  relationship: unknown;
  role: unknown;
  notes: unknown;
}): { ok: true; value: BeneficiaryDraft } | { ok: false; message: string } {
  const name = cleanLegacyText(input.name, 80);
  const relationship = cleanLegacyText(input.relationship, 40);
  const role = typeof input.role === "string" ? input.role : "";
  const notes = cleanLegacyText(input.notes, 280);
  if (!name) return fail("Add the person's name, or the name of a charity.");
  if (!relationship) return fail("Add a relationship, such as spouse, child, or charity.");
  if (!isBeneficiaryRole(role)) return fail("Choose primary or contingent.");
  const sensitive = sensitiveMessage([name, relationship, notes]);
  if (sensitive) return fail(sensitive);
  return { ok: true, value: { name, relationship, role, notes } };
}

export function parseInsuranceDraft(input: {
  kind: unknown;
  carrier: unknown;
  summary: unknown;
  status: unknown;
  notes: unknown;
}): { ok: true; value: InsuranceDraft } | { ok: false; message: string } {
  const kind = typeof input.kind === "string" ? input.kind : "";
  const status = typeof input.status === "string" ? input.status : "";
  const carrier = cleanLegacyText(input.carrier, 80);
  const summary = cleanLegacyText(input.summary, 280);
  const notes = cleanLegacyText(input.notes, 280);
  if (!isInsuranceKind(kind)) return fail("Choose the kind of coverage.");
  if (!isInsuranceStatus(status)) return fail("Choose whether that coverage is in force, in review, none, or unknown.");
  if (!summary) return fail("Add a short summary. Leave the policy number out.");
  const sensitive = sensitiveMessage([carrier, summary, notes]);
  if (sensitive) return fail(sensitive);
  return { ok: true, value: { kind, carrier, summary, status, notes } };
}

export function parseDocumentDraft(input: {
  title: unknown;
  kind: unknown;
  locationNote: unknown;
  fileName: unknown;
  notes: unknown;
}): { ok: true; value: DocumentDraft } | { ok: false; message: string } {
  const title = cleanLegacyText(input.title, 120);
  const kind = typeof input.kind === "string" ? input.kind : "";
  const locationNote = cleanLegacyText(input.locationNote, 200);
  const fileName = cleanLegacyText(input.fileName, 120);
  const notes = cleanLegacyText(input.notes, 280);
  if (!title) return fail("Add the document title.");
  if (!isDocumentKind(kind)) return fail("Choose the kind of document.");
  const sensitive = sensitiveMessage([title, locationNote, fileName, notes]);
  if (sensitive) return fail(sensitive);
  return { ok: true, value: { title, kind, locationNote, fileName, notes } };
}

export function presentChecklistItem(row: {
  id: string;
  key: string;
  area: string;
  title: string;
  detail: string;
  status: string;
  questions: string;
  sort: number;
}): ChecklistItemView | null {
  if (!isChecklistStatus(row.status)) return null;
  const template = templateByKey(row.key);
  const area = template?.area ?? (isLegacyArea(row.area) ? row.area : null);
  if (!area) return null;
  return {
    id: row.id,
    key: row.key,
    area,
    title: template?.title ?? row.title,
    detail: template?.detail ?? row.detail,
    ask: template?.ask ?? "",
    status: row.status,
    questions: row.questions,
    sort: row.sort,
  };
}

export function toDocumentView(row: {
  id: string;
  title: string;
  kind: string;
  locationNote: string;
  fileName: string;
  storageKey: string;
  notes: string;
}): DocumentView | null {
  if (!isDocumentKind(row.kind)) return null;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    locationNote: row.locationNote,
    fileName: row.fileName,
    pendingUpload: row.storageKey.length > 0,
    notes: row.notes,
  };
}

function checklistOpen(items: { key: string; status: ChecklistStatus }[], key: string): boolean {
  const item = items.find((row) => row.key === key);
  if (!item) return false;
  return item.status === "not_started" || item.status === "in_progress";
}

export function legacyGaps(input: {
  profile: Pick<LegacyProfile, "trustStatus" | "educationGoals" | "charitableIntentions" | "priorities">;
  checklist: ChecklistItemView[];
  beneficiaryCount: number;
  insuranceCount: number;
  documentCount: number;
}): LegacyGap[] {
  const gaps: LegacyGap[] = [];
  for (const item of input.checklist) {
    if (item.status !== "not_started" && item.status !== "in_progress") continue;
    gaps.push({
      id: `check-${item.key}`,
      title: item.title,
      detail: item.status === "in_progress" ? "In progress on your checklist." : "Not started on your checklist.",
      question: item.ask,
    });
  }
  if (input.beneficiaryCount === 0 && !checklistOpen(input.checklist, "beneficiary-designations")) {
    gaps.push({
      id: "beneficiaries",
      title: "No beneficiaries recorded",
      detail: "A name and a relationship is enough. Leave out government IDs.",
      question: "Who should be primary and contingent, and do the account forms match that intent?",
    });
  }
  if (input.insuranceCount === 0 && !checklistOpen(input.checklist, "life-insurance-inventory")) {
    gaps.push({
      id: "insurance",
      title: "Insurance inventory is empty",
      detail: "A short summary of what is in force is enough. Leave out policy numbers.",
      question: "Which coverage is in force, and what should I ask an insurance professional to review?",
    });
  }
  if (input.documentCount === 0 && !checklistOpen(input.checklist, "document-list")) {
    gaps.push({
      id: "documents",
      title: "No important documents listed",
      detail: "Record the title and where the original is kept. The file is not uploaded here.",
      question: "Which documents do I already have, and who should know where to find them?",
    });
  }
  if (!input.profile.educationGoals.trim() && !checklistOpen(input.checklist, "family-education")) {
    gaps.push({
      id: "education",
      title: "Family wealth education goals are blank",
      detail: "Write what you want the family to understand. Leave balances out.",
      question: "What should the family learn, and what should stay with a professional?",
    });
  }
  if (!input.profile.charitableIntentions.trim() && !checklistOpen(input.checklist, "charitable-intent")) {
    gaps.push({
      id: "giving",
      title: "Charitable giving intentions are blank",
      detail: "A sentence is enough, including a decision to wait.",
      question: "If I want to give, what should I ask a tax professional before I commit?",
    });
  }
  if (!input.profile.priorities.trim() && !checklistOpen(input.checklist, "legacy-priorities")) {
    gaps.push({
      id: "priorities",
      title: "Legacy priorities are blank",
      detail: "Write the outcomes you care about in your own words.",
      question: "What has to be true for the people I love, and what can wait?",
    });
  }
  if (input.profile.trustStatus === "not_started" && !checklistOpen(input.checklist, "trust-decision")) {
    gaps.push({
      id: "trust-status",
      title: "Trust planning status is still not started",
      detail: "Record whether you are exploring a trust, already have one, or this does not apply.",
      question: "Do I need a trust for what I own, or is another document enough? An attorney has to answer that.",
    });
  }
  return gaps;
}

export function assembleLegacy(input: {
  profile: LegacyProfile;
  checklist: ChecklistItemView[];
  beneficiaries: BeneficiaryView[];
  insurance: InsuranceView[];
  documents: DocumentView[];
}): LegacySnapshot {
  const checklist = [...input.checklist].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  return {
    profile: input.profile,
    checklist,
    beneficiaries: input.beneficiaries,
    insurance: input.insurance,
    documents: input.documents,
    gaps: legacyGaps({
      profile: input.profile,
      checklist,
      beneficiaryCount: input.beneficiaries.length,
      insuranceCount: input.insurance.length,
      documentCount: input.documents.length,
    }),
  };
}

export function emptyLegacySnapshot(): LegacySnapshot {
  return assembleLegacy({
    profile: { ...emptyProfile },
    checklist: checklistCatalog.map((item) => ({
      id: item.key,
      key: item.key,
      area: item.area,
      title: item.title,
      detail: item.detail,
      ask: item.ask,
      status: "not_started",
      questions: "",
      sort: item.sort,
    })),
    beneficiaries: [],
    insurance: [],
    documents: [],
  });
}

/** Guide payload. Null when the member has not opted in. Storage paths are never included. */
export function presentLegacyForGuide(
  snapshot: LegacySnapshot,
  access: { legacy: boolean },
): LegacySnapshot | null {
  if (!access.legacy) return null;
  return assembleLegacy({
    profile: snapshot.profile,
    checklist: snapshot.checklist,
    beneficiaries: snapshot.beneficiaries,
    insurance: snapshot.insurance,
    documents: snapshot.documents.map((document) => ({
      id: document.id,
      title: document.title,
      kind: document.kind,
      locationNote: document.locationNote,
      fileName: document.fileName,
      pendingUpload: document.pendingUpload,
      notes: document.notes,
    })),
  });
}
