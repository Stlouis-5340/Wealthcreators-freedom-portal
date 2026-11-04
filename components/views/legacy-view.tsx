"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LegacyDisclaimer } from "@/components/legacy-disclaimer";
import { PageHeader } from "@/components/page-header";
import {
  addBeneficiaryAction,
  addDocumentAction,
  addInsuranceAction,
  removeBeneficiaryAction,
  removeDocumentAction,
  removeInsuranceAction,
  saveChecklistItemAction,
  saveLegacyProfileAction,
} from "@/lib/legacy-actions";
import {
  beneficiaryRoleLabels,
  beneficiaryRoles,
  checklistStatusLabels,
  checklistStatuses,
  documentKindLabels,
  documentKinds,
  insuranceKindLabels,
  insuranceKinds,
  insuranceStatusLabels,
  insuranceStatuses,
  legacyAreas,
  trustStatusLabels,
  trustStatuses,
  type BeneficiaryView,
  type ChecklistItemView,
  type ChecklistStatus,
  type DocumentView,
  type InsuranceView,
  type LegacySnapshot,
} from "@/lib/legacy";

export function LegacyView({ data }: { data: LegacySnapshot }) {
  const openCount = data.gaps.length;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Legacy"
        title="Generational wealth planner"
        lede="A private place to list beneficiaries, estate steps, coverage summaries, and the questions you want to take to a qualified professional. Your Wealth Guide does not see this unless you turn Legacy on under Guide access."
      />
      <LegacyDisclaimer />
      <Gaps data={data} openCount={openCount} />
      <ProfileForm data={data} />
      <Checklist data={data} />
      <Beneficiaries items={data.beneficiaries} />
      <Insurance items={data.insurance} />
      <Documents items={data.documents} />
    </div>
  );
}

function Gaps({ data, openCount }: { data: LegacySnapshot; openCount: number }) {
  return (
    <section className="wc-card p-5 sm:p-6" aria-labelledby="legacy-gaps">
      <p className="wc-eyebrow">Missing steps</p>
      <h2 id="legacy-gaps" className="mt-2 text-xl font-semibold tracking-tight text-ink">
        {openCount === 0 ? "Nothing open on this list" : `${openCount} still open`}
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Open items are reminders, not a legal opinion. The questions underneath are prompts you can take to an
        attorney, tax professional, or advisor.
      </p>
      {openCount === 0 ? (
        <p className="mt-4 text-sm leading-6 text-gold">
          The steps you track here are filled in or marked N/A. A qualified professional still needs to review the
          real documents.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {data.gaps.map((gap) => (
            <li key={gap.id} className="rounded-2xl border border-line bg-background px-4 py-3">
              <p className="text-sm font-medium text-ink">{gap.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{gap.detail}</p>
              {gap.question ? (
                <p className="mt-2 text-sm leading-6 text-gold-muted">
                  <span className="text-gold">Ask: </span>
                  {gap.question}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfileForm({ data }: { data: LegacySnapshot }) {
  const { profile } = data;
  const [trustStatus, setTrustStatus] = useState(profile.trustStatus);
  const [trustNotes, setTrustNotes] = useState(profile.trustNotes);
  const [educationGoals, setEducationGoals] = useState(profile.educationGoals);
  const [charitableIntentions, setCharitableIntentions] = useState(profile.charitableIntentions);
  const [priorities, setPriorities] = useState(profile.priorities);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    setMessage("");
    const result = await saveLegacyProfileAction({
      trustStatus,
      trustNotes,
      educationGoals,
      charitableIntentions,
      priorities,
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="wc-card space-y-5 p-5 sm:p-6">
      <div>
        <p className="wc-eyebrow">Your words</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Priorities, trust, family, and giving</h2>
      </div>
      <Select
        id="trust-status"
        label="Trust planning status"
        value={trustStatus}
        onChange={setTrustStatus}
        options={trustStatuses.map((status) => ({ value: status, label: trustStatusLabels[status] }))}
      />
      <TextArea id="trust-notes" label="Trust notes" value={trustNotes} onChange={setTrustNotes} maxLength={600} />
      <TextArea
        id="legacy-priorities"
        label="Legacy priorities"
        value={priorities}
        onChange={setPriorities}
        maxLength={600}
      />
      <TextArea
        id="education-goals"
        label="Family wealth education goals"
        value={educationGoals}
        onChange={setEducationGoals}
        maxLength={600}
      />
      <TextArea
        id="charitable-intentions"
        label="Charitable giving intentions"
        value={charitableIntentions}
        onChange={setCharitableIntentions}
        maxLength={600}
      />
      <SaveRow pending={pending} saved={saved} message={message} label="Save priorities" />
    </form>
  );
}

function Checklist({ data }: { data: LegacySnapshot }) {
  return (
    <section className="space-y-5" aria-labelledby="legacy-checklist">
      <div>
        <p className="wc-eyebrow">Checklist</p>
        <h2 id="legacy-checklist" className="mt-2 text-xl font-semibold tracking-tight text-ink">
          Estate and legacy steps
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Mark each step not started, in progress, done, or N/A. The notes field is for questions you want to ask a
          professional.
        </p>
      </div>
      {legacyAreas.map((area) => {
        const items = data.checklist.filter((item) => item.area === area.id);
        if (items.length === 0) return null;
        return (
          <div key={area.id} className="space-y-3">
            <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-gold-muted">{area.label}</h3>
            {items.map((item) => (
              <ChecklistCard key={item.id} item={item} />
            ))}
          </div>
        );
      })}
    </section>
  );
}

function ChecklistCard({ item }: { item: ChecklistItemView }) {
  const [status, setStatus] = useState<ChecklistStatus>(item.status);
  const [questions, setQuestions] = useState(item.questions);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    setMessage("");
    const result = await saveChecklistItemAction({ itemId: item.id, status, questions });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="wc-card space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-base font-medium text-ink">{item.title}</h4>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">{checklistStatusLabels[item.status]}</p>
      </div>
      <p className="text-sm leading-6 text-muted">{item.detail}</p>
      <Select
        id={`status-${item.id}`}
        label="Status"
        value={status}
        onChange={setStatus}
        options={checklistStatuses.map((option) => ({ value: option, label: checklistStatusLabels[option] }))}
      />
      <TextArea
        id={`questions-${item.id}`}
        label="Questions for my attorney or advisor"
        value={questions}
        onChange={setQuestions}
        maxLength={500}
      />
      <SaveRow pending={pending} saved={saved} message={message} label="Save step" />
    </form>
  );
}

function Beneficiaries({ items }: { items: BeneficiaryView[] }) {
  return (
    <section className="space-y-4" aria-labelledby="legacy-beneficiaries">
      <div>
        <p className="wc-eyebrow">Beneficiaries</p>
        <h2 id="legacy-beneficiaries" className="mt-2 text-xl font-semibold tracking-tight text-ink">
          People and charities to remember
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Names and relationships only. Do not add a Social Security number, a date of birth, or an account number.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">None recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="wc-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-medium text-ink">{item.name}</h3>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                  {beneficiaryRoleLabels[item.role]}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted">{item.relationship}</p>
              {item.notes ? <p className="mt-2 text-sm leading-6 text-ink">{item.notes}</p> : null}
              <RemoveButton action={() => removeBeneficiaryAction(item.id)} label={`Remove ${item.name}`} />
            </li>
          ))}
        </ul>
      )}
      <BeneficiaryForm />
    </section>
  );
}

function BeneficiaryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [role, setRole] = useState("primary");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    setMessage("");
    const result = await addBeneficiaryAction({ name, relationship, role, notes });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setName("");
    setRelationship("");
    setRole("primary");
    setNotes("");
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="wc-card space-y-4 p-5">
      <h3 className="text-base font-medium text-ink">Add a beneficiary</h3>
      <Field id="beneficiary-name" label="Name" value={name} onChange={setName} maxLength={80} />
      <Field
        id="beneficiary-relationship"
        label="Relationship"
        value={relationship}
        onChange={setRelationship}
        maxLength={40}
      />
      <Select
        id="beneficiary-role"
        label="Role"
        value={role}
        onChange={setRole}
        options={beneficiaryRoles.map((option) => ({ value: option, label: beneficiaryRoleLabels[option] }))}
      />
      <TextArea id="beneficiary-notes" label="Notes" value={notes} onChange={setNotes} maxLength={280} />
      <SaveRow pending={pending} saved={saved} message={message} label="Add beneficiary" />
    </form>
  );
}

function Insurance({ items }: { items: InsuranceView[] }) {
  return (
    <section className="space-y-4" aria-labelledby="legacy-insurance">
      <div>
        <p className="wc-eyebrow">Insurance</p>
        <h2 id="legacy-insurance" className="mt-2 text-xl font-semibold tracking-tight text-ink">
          Coverage inventory
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Summaries only. Keep policy numbers in the folder where the policy lives.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No coverage summarized yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="wc-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-medium text-ink">{insuranceKindLabels[item.kind]}</h3>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                  {insuranceStatusLabels[item.status]}
                </p>
              </div>
              {item.carrier ? <p className="mt-1 text-sm text-muted">{item.carrier}</p> : null}
              <p className="mt-2 text-sm leading-6 text-ink">{item.summary}</p>
              {item.notes ? <p className="mt-2 text-sm leading-6 text-muted">{item.notes}</p> : null}
              <RemoveButton
                action={() => removeInsuranceAction(item.id)}
                label={`Remove ${insuranceKindLabels[item.kind]} summary`}
              />
            </li>
          ))}
        </ul>
      )}
      <InsuranceForm />
    </section>
  );
}

function InsuranceForm() {
  const router = useRouter();
  const [kind, setKind] = useState("life");
  const [carrier, setCarrier] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("unknown");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    setMessage("");
    const result = await addInsuranceAction({ kind, carrier, summary, status, notes });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setCarrier("");
    setSummary("");
    setNotes("");
    setStatus("unknown");
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="wc-card space-y-4 p-5">
      <h3 className="text-base font-medium text-ink">Add a coverage summary</h3>
      <Select
        id="insurance-kind"
        label="Kind"
        value={kind}
        onChange={setKind}
        options={insuranceKinds.map((option) => ({ value: option, label: insuranceKindLabels[option] }))}
      />
      <Field id="insurance-carrier" label="Carrier, if you want it named" value={carrier} onChange={setCarrier} maxLength={80} />
      <TextArea id="insurance-summary" label="Summary" value={summary} onChange={setSummary} maxLength={280} />
      <Select
        id="insurance-status"
        label="Status"
        value={status}
        onChange={setStatus}
        options={insuranceStatuses.map((option) => ({ value: option, label: insuranceStatusLabels[option] }))}
      />
      <TextArea id="insurance-notes" label="Notes" value={notes} onChange={setNotes} maxLength={280} />
      <SaveRow pending={pending} saved={saved} message={message} label="Add coverage" />
    </form>
  );
}

function Documents({ items }: { items: DocumentView[] }) {
  return (
    <section className="space-y-4" aria-labelledby="legacy-documents">
      <div>
        <p className="wc-eyebrow">Documents</p>
        <h2 id="legacy-documents" className="mt-2 text-xl font-semibold tracking-tight text-ink">
          Where the important papers live
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Record the title and where you keep the original. The portal does not upload the file. A private file store
          is planned, and until then a file name only reserves a placeholder path on the server.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No documents listed yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="wc-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-medium text-ink">{item.title}</h3>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                  {documentKindLabels[item.kind]}
                </p>
              </div>
              {item.locationNote ? <p className="mt-2 text-sm leading-6 text-ink">{item.locationNote}</p> : null}
              {item.fileName ? <p className="mt-2 text-sm text-muted">File name recorded: {item.fileName}</p> : null}
              {item.pendingUpload ? (
                <p className="mt-2 text-sm text-gold-muted">File bytes are not stored. Upload is not connected yet.</p>
              ) : null}
              {item.notes ? <p className="mt-2 text-sm leading-6 text-muted">{item.notes}</p> : null}
              <RemoveButton action={() => removeDocumentAction(item.id)} label={`Remove ${item.title}`} />
            </li>
          ))}
        </ul>
      )}
      <DocumentForm />
    </section>
  );
}

function DocumentForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("will");
  const [locationNote, setLocationNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    setMessage("");
    const result = await addDocumentAction({ title, kind, locationNote, fileName, notes });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setTitle("");
    setLocationNote("");
    setFileName("");
    setNotes("");
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="wc-card space-y-4 p-5">
      <h3 className="text-base font-medium text-ink">Record a document</h3>
      <Field id="document-title" label="Title" value={title} onChange={setTitle} maxLength={120} />
      <Select
        id="document-kind"
        label="Kind"
        value={kind}
        onChange={setKind}
        options={documentKinds.map((option) => ({ value: option, label: documentKindLabels[option] }))}
      />
      <Field
        id="document-location"
        label="Where the original is kept"
        value={locationNote}
        onChange={setLocationNote}
        maxLength={200}
      />
      <Field
        id="document-filename"
        label="File name, optional"
        value={fileName}
        onChange={setFileName}
        maxLength={120}
      />
      <TextArea id="document-notes" label="Notes" value={notes} onChange={setNotes} maxLength={280} />
      <SaveRow pending={pending} saved={saved} message={message} label="Save document" />
    </form>
  );
}

function RemoveButton({ action, label }: { action: () => Promise<{ ok: boolean; message: string }>; label: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setMessage("");
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button type="button" className="wc-btn wc-btn-ghost" onClick={onClick} disabled={pending}>
        {pending ? "Removing" : label}
      </button>
      {message ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function SaveRow({
  pending,
  saved,
  message,
  label,
}: {
  pending: boolean;
  saved: boolean;
  message: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
        {pending ? "Saving" : label}
      </button>
      {message ? (
        <p className="text-sm text-danger" role="alert">
          {message}
        </p>
      ) : null}
      {saved ? <p className="text-sm text-gold">Saved.</p> : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}) {
  return (
    <label className="block text-sm text-ink" htmlFor={id}>
      {label}
      <input
        id={id}
        className="wc-input mt-1.5"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}) {
  return (
    <label className="block text-sm text-ink" htmlFor={id}>
      {label}
      <textarea
        id={id}
        className="wc-input mt-1.5 min-h-24"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Select<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="block text-sm text-ink" htmlFor={id}>
      {label}
      <select
        id={id}
        className="wc-input mt-1.5"
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value);
          if (next) onChange(next.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
