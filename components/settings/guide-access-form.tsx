"use client";

import { useActionState } from "react";
import { updateGuideAccessAction, type GrantFormState } from "@/lib/grant-actions";
import type { GuideAccess } from "@/lib/access";

const initial: GrantFormState = { error: "", saved: false };

export function GuideAccessForm({
  guideId,
  guideName,
  access,
}: {
  guideId: string;
  guideName: string;
  access: GuideAccess;
}) {
  const [state, action, pending] = useActionState(updateGuideAccessAction, initial);

  return (
    <form action={action} className="wc-card space-y-4 p-5">
      <input type="hidden" name="guideId" value={guideId} />
      <div>
        <h2 className="text-lg font-semibold text-ink">{guideName}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Turn a part on when you want coaching help with it. Turn it off when you want that part
          to stay between you and the portal. This does not change your plan.
        </p>
      </div>
      <Toggle name="score" label="Freedom Score, Gap, and Quality" defaultChecked={access.score} />
      <Toggle name="totals" label="Totals: net worth, passive income, and spending-plan total" defaultChecked={access.totals} />
      <Toggle name="goals" label="Six-year goals" defaultChecked={access.goals} />
      <Toggle name="checkIns" label="Weekly check-ins" defaultChecked={access.checkIns} />
      <Toggle
        name="education"
        label="Learning progress: lessons finished and quiz scores, not the answers"
        defaultChecked={access.education}
      />
      <p className="text-xs leading-5 text-muted">
        Check-ins include the words you wrote and the score snapshot from that week. Coaching tasks
        your Guide assigns stay visible so follow-ups are not lost. Category spending and
        transactions stay off. Guides never see bank names, account numbers, or connection tokens.
      </p>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.saved ? <p className="text-sm text-success">Saved. Your Guide sees this on the next visit.</p> : null}
      <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save visibility"}
      </button>
    </form>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-6 text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1" />
      <span>{label}</span>
    </label>
  );
}
