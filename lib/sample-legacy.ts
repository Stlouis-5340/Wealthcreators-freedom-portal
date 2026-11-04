import { placeholderStorageKey, type ChecklistStatus } from "@/lib/legacy";

/** Light demo for alex@wealthcreators.test. No SSNs, account numbers, or policy numbers. */
export const alexLegacyProfile = {
  trustStatus: "exploring" as const,
  trustNotes:
    "Jordan and I talked about whether a revocable trust is worth a conversation with an attorney. Nothing is signed.",
  educationGoals:
    "By the time the kids are teenagers, they can explain income versus a one-time bonus, and they know where the family letter of instruction lives.",
  charitableIntentions:
    "A small annual gift to a local scholarship fund is the idea. A bequest, if any, waits until an attorney and the spending plan both say it fits. Not decided.",
  priorities:
    "Keep the household plan intact, name guardians, and make the documents easy for the family to find. Transfer details wait for an attorney.",
};

export const alexChecklistSeed: Record<string, { status: ChecklistStatus; questions: string }> = {
  "will-reviewed": {
    status: "in_progress",
    questions: "Does a simple will cover the duplex, or do I need a different document? I will ask an attorney.",
  },
  "powers-of-attorney": { status: "not_started", questions: "" },
  "healthcare-directive": { status: "done", questions: "" },
  "beneficiary-designations": {
    status: "in_progress",
    questions: "Which forms should name a person, and which should wait until an attorney says whether a trust fits?",
  },
  guardians: {
    status: "in_progress",
    questions: "Who is the backup if the first choice cannot serve?",
  },
  "trust-decision": {
    status: "in_progress",
    questions: "Is a revocable trust useful for the duplex and the brokerage, or is that the wrong tool?",
  },
  "life-insurance-inventory": { status: "done", questions: "" },
  "liability-coverage": { status: "not_started", questions: "" },
  "document-list": {
    status: "in_progress",
    questions: "Who besides me should know where the letter of instruction is?",
  },
  "family-education": {
    status: "in_progress",
    questions: "What is age-appropriate to explain, and what should stay with the attorney?",
  },
  "charitable-intent": { status: "not_started", questions: "" },
  "legacy-priorities": { status: "done", questions: "" },
};

export const alexBeneficiaries = [
  {
    id: "alex-legacy-ben-sam",
    name: "Sam Rivera",
    relationship: "Spouse",
    role: "primary" as const,
    notes: "First person named on the letter of instruction.",
    sort: 0,
  },
  {
    id: "alex-legacy-ben-children",
    name: "Rivera children",
    relationship: "Children",
    role: "contingent" as const,
    notes: "Named as a group until an attorney writes the exact language. No government IDs here.",
    sort: 1,
  },
];

export const alexInsurance = [
  {
    id: "alex-legacy-ins-life",
    kind: "life" as const,
    carrier: "Sample Mutual",
    summary: "Term life is in force. The amount and the policy number stay in the folder at home.",
    status: "in_force" as const,
    notes: "",
    sort: 0,
  },
  {
    id: "alex-legacy-ins-property",
    kind: "property" as const,
    carrier: "",
    summary: "Home and duplex policies exist. Liability limits have not been reviewed this year.",
    status: "reviewing" as const,
    notes: "",
    sort: 1,
  },
];

const lifeDocumentId = "alex-legacy-doc-life";
const lifeFileName = "term-life-summary.pdf";

export const alexDocuments = [
  {
    id: "alex-legacy-doc-letter",
    title: "Letter of instruction",
    kind: "letter" as const,
    locationNote: "Fire safe at home, top drawer.",
    fileName: "",
    storageKey: "",
    notes: "A paper letter. It is not uploaded here.",
  },
  {
    id: lifeDocumentId,
    title: "Term life policy summary",
    kind: "insurance" as const,
    locationNote: "Insurance folder, home office.",
    fileName: lifeFileName,
    storageKey: placeholderStorageKey("alex", lifeDocumentId, lifeFileName),
    notes: "Title only. The PDF is not stored in the portal.",
  },
];
