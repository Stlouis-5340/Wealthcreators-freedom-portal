import { LegacyDisclaimer } from "@/components/legacy-disclaimer";
import { writeAudit } from "@/lib/audit";
import {
  beneficiaryRoleLabels,
  checklistStatusLabels,
  documentKindLabels,
  insuranceKindLabels,
  insuranceStatusLabels,
  legacyAreas,
  trustStatusLabels,
} from "@/lib/legacy";
import { loadGuideLegacy } from "@/lib/legacy-store";
import { requireGuide } from "@/lib/permissions";

/** Read-only legacy notes. Private plans are not loaded. */
export async function GuideLegacy({ memberId }: { memberId: string }) {
  const guide = await requireGuide();
  if (!guide) return null;
  const payload = await loadGuideLegacy(guide.id, memberId);
  if (!payload) return null;

  if (!payload.shared) {
    return (
      <section className="wc-card p-5 sm:p-6">
        <p className="wc-eyebrow">Legacy</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Private</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          This member has not shared the legacy planner. Beneficiaries, documents, insurance summaries, and checklist
          notes stay on their side.
        </p>
      </section>
    );
  }

  try {
    await writeAudit({
      actorUserId: guide.id,
      action: "guide.view_legacy",
      targetType: "member",
      targetId: memberId,
      meta: {
        checklist: payload.view.checklist.length,
        beneficiaries: payload.view.beneficiaries.length,
        documents: payload.view.documents.length,
      },
    });
  } catch {
    // The notes still render if the audit row cannot be written.
  }

  const { view } = payload;
  return (
    <section className="wc-card space-y-6 p-5 sm:p-6">
      <div>
        <p className="wc-eyebrow">Legacy</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Shared planner</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Read-only notes this member chose to share. Document files are not stored, and storage paths are not shown.
          This is not legal advice.
        </p>
      </div>
      <LegacyDisclaimer />
      <div>
        <h3 className="text-base font-medium text-ink">Trust planning</h3>
        <p className="mt-2 text-sm text-gold">{trustStatusLabels[view.profile.trustStatus]}</p>
        {view.profile.trustNotes ? <p className="mt-2 text-sm leading-6 text-ink">{view.profile.trustNotes}</p> : null}
      </div>
      <NoteBlock title="Legacy priorities" body={view.profile.priorities} />
      <NoteBlock title="Family wealth education" body={view.profile.educationGoals} />
      <NoteBlock title="Charitable giving" body={view.profile.charitableIntentions} />
      <div>
        <h3 className="text-base font-medium text-ink">Open steps</h3>
        {view.gaps.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No open checklist step in the shared plan.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {view.gaps.map((gap) => (
              <li key={gap.id} className="text-sm leading-6 text-ink">
                {gap.title}
                {gap.question ? <span className="text-muted"> — {gap.question}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {legacyAreas.map((area) => {
        const items = view.checklist.filter((item) => item.area === area.id);
        if (items.length === 0) return null;
        return (
          <div key={area.id}>
            <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-gold-muted">{area.label}</h3>
            <ul className="mt-2 space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <p className="text-sm font-medium text-ink">
                    {item.title}{" "}
                    <span className="font-normal text-gold">{checklistStatusLabels[item.status]}</span>
                  </p>
                  {item.questions ? <p className="mt-1 text-sm leading-6 text-muted">{item.questions}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div>
        <h3 className="text-base font-medium text-ink">Beneficiaries</h3>
        {view.beneficiaries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None recorded.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {view.beneficiaries.map((person) => (
              <li key={person.id} className="text-sm leading-6 text-ink">
                {person.name} · {person.relationship} · {beneficiaryRoleLabels[person.role]}
                {person.notes ? <span className="text-muted"> — {person.notes}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-base font-medium text-ink">Insurance summaries</h3>
        {view.insurance.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None recorded.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {view.insurance.map((item) => (
              <li key={item.id} className="text-sm leading-6 text-ink">
                {insuranceKindLabels[item.kind]} · {insuranceStatusLabels[item.status]}
                {item.carrier ? ` · ${item.carrier}` : ""} — {item.summary}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-base font-medium text-ink">Documents</h3>
        {view.documents.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None recorded.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {view.documents.map((item) => (
              <li key={item.id} className="text-sm leading-6 text-ink">
                {item.title} · {documentKindLabels[item.kind]}
                {item.locationNote ? <span className="text-muted"> — {item.locationNote}</span> : null}
                {item.pendingUpload ? <span className="text-muted"> — file not uploaded</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function NoteBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-base font-medium text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink">{body || "Nothing written."}</p>
    </div>
  );
}
