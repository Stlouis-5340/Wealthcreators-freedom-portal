"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { usePortal } from "@/components/portal-provider";
import { saveWeeklyCheckInAction } from "@/lib/activity-actions";
import { actionLabel, sortCheckIns, type ActionStatus } from "@/lib/check-in";
import { chicagoWeekKey, formatChicagoDateTime, formatWeekSpan } from "@/lib/week";

const actions: { value: ActionStatus; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partly" },
  { value: "no", label: "Not yet" },
];

export function CheckInView() {
  const router = useRouter();
  const { roster, viewer } = usePortal();
  const weekKey = chicagoWeekKey();
  const history = sortCheckIns(roster.find((member) => member.id === viewer.id)?.checkIns ?? []);
  const current = history.find((checkIn) => checkIn.weekKey === weekKey);
  const [win, setWin] = useState(current?.win ?? "");
  const [challenge, setChallenge] = useState(current?.challenge ?? "");
  const [actionStatus, setActionStatus] = useState<ActionStatus | "">(current?.actionStatus ?? "");
  const [commitment, setCommitment] = useState(current?.commitment ?? "");
  const [needsSupport, setNeedsSupport] = useState<boolean | null>(current?.needsSupport ?? null);
  const [supportNote, setSupportNote] = useState(current?.supportNote ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (needsSupport == null || actionStatus === "") {
      setError("Answer each question before saving.");
      return;
    }
    setPending(true);
    setError("");
    const result = await saveWeeklyCheckInAction({
      win,
      challenge,
      actionStatus,
      commitment,
      needsSupport,
      supportNote,
    });
    setPending(false);
    if (!result.ok) {
      setSaved(false);
      setError(result.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="wc-eyebrow">Weekly check-in</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {current ? "Update this week" : "Check in this week"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Week of {formatWeekSpan(weekKey)}, America/Chicago. Five questions. Most people finish in
          under three minutes. This is a coaching reflection. It is not a forecast, and it does not
          promise a result.
        </p>
      </header>

      <form onSubmit={onSubmit} className="wc-card space-y-6 p-5 sm:p-6">
        <Field
          id="win"
          label="1. What financial win did you have this week?"
          value={win}
          onChange={setWin}
        />
        <Field
          id="challenge"
          label="2. What challenge did you face?"
          value={challenge}
          onChange={setChallenge}
        />
        <fieldset>
          <legend className="text-sm font-medium text-ink">3. Did you complete your priority action?</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {actions.map((action) => (
              <label key={action.value} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="actionStatus"
                  value={action.value}
                  checked={actionStatus === action.value}
                  onChange={() => setActionStatus(action.value)}
                  required
                />
                {action.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          id="commitment"
          label="4. What is your next commitment?"
          value={commitment}
          onChange={setCommitment}
        />
        <fieldset>
          <legend className="text-sm font-medium text-ink">
            5. Do you need support from your Wealth Guide?
          </legend>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="needsSupport"
                checked={needsSupport === true}
                onChange={() => setNeedsSupport(true)}
                required
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="needsSupport"
                checked={needsSupport === false}
                onChange={() => setNeedsSupport(false)}
                required
              />
              No
            </label>
          </div>
          <label className="mt-4 block text-sm text-muted" htmlFor="supportNote">
            Optional note
            <textarea
              id="supportNote"
              value={supportNote}
              onChange={(event) => setSupportNote(event.target.value)}
              className="wc-input mt-2 min-h-20"
              maxLength={1000}
            />
          </label>
        </fieldset>

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="text-sm text-success">
            Saved for the week of {formatWeekSpan(weekKey)}. You can change it until Sunday.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
            {pending ? "Saving…" : current ? "Update this week's check-in" : "Save this week's check-in"}
          </button>
          <Link href="/" className="text-sm text-gold-muted hover:text-gold">
            Back to the dashboard
          </Link>
        </div>
      </form>

      {current ? (
        <section className="wc-card p-5 sm:p-6">
          <p className="wc-eyebrow">What your Guide sees</p>
          <p className="mt-3 text-sm leading-6 text-ink">{current.summary}</p>
        </section>
      ) : null}

      {history.filter((checkIn) => checkIn.weekKey !== weekKey).length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Earlier weeks</h2>
          <ul className="space-y-3">
            {history
              .filter((checkIn) => checkIn.weekKey !== weekKey)
              .map((checkIn) => (
                <li key={checkIn.id} className="wc-card p-4">
                  <p className="text-sm text-ink">{checkIn.summary}</p>
                  <p className="mt-2 text-xs text-muted">
                    {actionLabel(checkIn.actionStatus)} on the priority action · saved{" "}
                    {formatChicagoDateTime(checkIn.updatedAt)}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-ink" htmlFor={id}>
      {label}
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        maxLength={1000}
        className="wc-input mt-2 min-h-24 font-normal"
      />
    </label>
  );
}
