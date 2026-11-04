import { fullGuideAccess, parseGuideAccess, serializeGuideAccess } from "../lib/access";
import {
  assembleLegacy,
  checklistCatalog,
  containsSensitiveId,
  emptyLegacySnapshot,
  legacyGaps,
  parseBeneficiaryDraft,
  parseChecklistDraft,
  placeholderStorageKey,
  presentLegacyForGuide,
  toDocumentView,
  type ChecklistItemView,
} from "../lib/legacy";
import { alexChecklistSeed, alexDocuments, alexLegacyProfile } from "../lib/sample-legacy";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const keys = checklistCatalog.map((item) => item.key);
assert(new Set(keys).size === keys.length, "checklist keys are unique");
assert(checklistCatalog.length >= 8, "the checklist covers the legacy topics");
assert(checklistCatalog.every((item) => item.ask.length > 0 && !containsSensitiveId(item.ask)), "prompts stay free of IDs");

assert(containsSensitiveId("SSN 123-45-6789"), "a dashed SSN is rejected");
assert(containsSensitiveId("id 123456789"), "a 9-digit token is rejected");
assert(!containsSensitiveId("Term life is in force. The amount stays at home."), "a summary without a number is allowed");
assert(!containsSensitiveId(alexLegacyProfile.priorities), "Alex's priorities have no government ID");

const rejected = parseBeneficiaryDraft({
  name: "Sam",
  relationship: "Spouse",
  role: "primary",
  notes: "SSN 123-45-6789",
});
assert(!rejected.ok, "beneficiary notes cannot hold an SSN");

const status = parseChecklistDraft({ status: "in_progress", questions: "Who is the backup?" });
assert(status.ok && status.value.status === "in_progress", "in progress is a valid checklist status");
assert(!parseChecklistDraft({ status: "signed", questions: "" }).ok, "unknown checklist status is rejected");

const path = placeholderStorageKey("alex", "alex-legacy-doc-life", "term-life-summary.pdf");
assert(path.startsWith("legacy/alex/"), "placeholder path is private and namespaced");
assert(!path.includes("://") && !path.startsWith("http"), "placeholder path is not a public URL");
assert(alexDocuments[1]?.storageKey === path, "Alex's file name reserves the same placeholder");
assert(alexDocuments[0]?.storageKey === "", "a paper letter has no storage path");
assert(!JSON.stringify(alexDocuments).includes("123-45-6789"), "seed documents have no SSN");

const seeded = emptyLegacySnapshot();
const checklist: ChecklistItemView[] = seeded.checklist.map((item) => {
  const overlay = alexChecklistSeed[item.key];
  return overlay ? { ...item, status: overlay.status, questions: overlay.questions } : item;
});
const alexView = assembleLegacy({
  profile: { ...alexLegacyProfile, updatedAt: null },
  checklist,
  beneficiaries: [
    { id: "one", name: "Sam Rivera", relationship: "Spouse", role: "primary", notes: "" },
  ],
  insurance: [
    {
      id: "life",
      kind: "life",
      carrier: "Sample Mutual",
      summary: "Term life is in force.",
      status: "in_force",
      notes: "",
    },
  ],
  documents: [
    {
      id: "letter",
      title: "Letter of instruction",
      kind: "letter",
      locationNote: "Fire safe",
      fileName: "",
      pendingUpload: false,
      notes: "",
    },
  ],
});
assert(alexView.gaps.some((gap) => gap.id === "check-powers-of-attorney"), "an untouched step stays open");
assert(alexView.gaps.some((gap) => gap.id === "check-liability-coverage"), "liability coverage is still a missing step");
assert(!alexView.gaps.some((gap) => gap.id === "check-healthcare-directive"), "a done step is not a gap");
assert(alexView.gaps.every((gap) => gap.question.length > 0), "each open step has a question to take to a professional");

const hidden = presentLegacyForGuide(alexView, { legacy: false });
assert(hidden == null, "a guide without the legacy scope sees nothing");
const shared = presentLegacyForGuide(alexView, { ...fullGuideAccess, legacy: true });
assert(shared != null && shared.beneficiaries.length === 1, "an opted-in guide can see a beneficiary");
assert(!JSON.stringify(shared).includes("storageKey"), "the guide payload has no storage key");
assert(!JSON.stringify(shared).includes("legacy/alex"), "the guide payload has no placeholder path");

const stripped = toDocumentView({
  id: "doc",
  title: "Summary",
  kind: "insurance",
  locationNote: "Home",
  fileName: "term-life-summary.pdf",
  storageKey: path,
  notes: "",
});
assert(stripped?.pendingUpload === true, "a reserved path means the upload is still pending");
assert(stripped && !JSON.stringify(stripped).includes(path), "the page view drops the storage path");

assert(fullGuideAccess.legacy === false, "the coaching default keeps legacy private");
assert(parseGuideAccess(serializeGuideAccess(fullGuideAccess)).legacy === false, "a full grant still keeps legacy off");
assert(parseGuideAccess('{"score":true,"goals":true}').legacy === false, "older grants without the key stay private");
assert(parseGuideAccess('{"legacy":true}').legacy === true, "an explicit opt-in is honored");

const empty = legacyGaps({
  profile: { trustStatus: "not_started", educationGoals: "", charitableIntentions: "", priorities: "" },
  checklist: [],
  beneficiaryCount: 0,
  insuranceCount: 0,
  documentCount: 0,
});
assert(empty.some((gap) => gap.id === "beneficiaries"), "an empty beneficiary list is a missing step when the checklist is done");

console.log("legacy checks passed");
