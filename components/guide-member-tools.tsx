"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { usePortal } from "@/components/portal-provider";
import {
  addCoachingNoteAction,
  addCoachingTaskAction,
  setCoachingTaskStatusAction,
} from "@/lib/activity-actions";
import { actionLabel, sortCheckIns } from "@/lib/check-in";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import { chicagoDateISO, formatChicagoDateTime, formatWeekSpan } from "@/lib/week";

export function GuideMemberTools({ memberId }: { memberId: string }) {
  const { memberById } = usePortal();
  const member = memberById(memberId);
  if (!member) return null;
  const access = member.access;
  const checkIns = access.checkIns ? sortCheckIns(member.checkIns) : [];
  const latest = checkIns[0];
  const today = chicagoDateISO();

  return (
    <div className="space-y-8">
      {access.checkIns ? (
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">
            Weekly check-ins
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Read only. One check-in per week. The score, gap, and quality are the snapshot saved
            when the member submitted. They are not a promise about next month.
          </p>
        </div>
        {latest ? (
          <article className="wc-card p-5 sm:p-6">
            <p className="wc-eyebrow">Latest · week of {formatWeekSpan(latest.weekKey)}</p>
            <p className="mt-3 text-sm leading-6 text-ink">{latest.summary}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Answer label="Win" value={latest.win} />
              <Answer label="Challenge" value={latest.challenge} />
              <Answer label="Priority action" value={actionLabel(latest.actionStatus)} />
              <Answer label="Next commitment" value={latest.commitment} />
              <Answer label="Asked for support" value={latest.needsSupport ? "Yes" : "No"} />
              <Answer label="Note" value={latest.supportNote.trim() || "None"} />
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted">
              At submit: Freedom Score {formatPercentOrDash(latest.freedomScore, 1)}, Freedom Gap{" "}
              {latest.monthlyFreedomGap == null ? "—" : formatMoney(latest.monthlyFreedomGap)} a month, Quality{" "}
              {latest.qualityScore == null ? "—" : `${Math.round(latest.qualityScore)}/100`}. Saved{" "}
              {formatChicagoDateTime(latest.updatedAt)}.
            </p>
          </article>
        ) : (
          <p className="wc-card px-5 py-6 text-sm text-muted">No check-in yet.</p>
        )}
        {checkIns.length > 1 ? (
          <ul className="space-y-3">
            {checkIns.slice(1).map((checkIn) => (
              <li key={checkIn.id} className="wc-card p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                  Week of {formatWeekSpan(checkIn.weekKey)}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink">{checkIn.summary}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      ) : (
        <p className="wc-card px-5 py-6 text-sm leading-6 text-muted">
          Weekly check-ins are not shared. A check-in includes the words the member wrote and the
          score snapshot from that week.
        </p>
      )}

      <Notes memberId={member.id} notes={member.notes} />
      {access.tasks ? (
        <Tasks memberId={member.id} tasks={member.tasks} today={today} />
      ) : (
        <p className="wc-card px-5 py-6 text-sm leading-6 text-muted">Coaching tasks are not shared.</p>
      )}
    </div>
  );
}

function Answer({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 leading-6 text-ink">{value}</dd>
    </div>
  );
}

function Notes({
  memberId,
  notes,
}: {
  memberId: string;
  notes: ReturnType<typeof usePortal>["roster"][number]["notes"];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const ordered = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await addCoachingNoteAction(memberId, body);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">
          Coaching notes
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          A timestamped note stays on this member. It is separate from the short roster line above.
        </p>
      </div>
      <form onSubmit={onSubmit} className="wc-card space-y-3 p-5">
        <label className="block text-sm text-ink" htmlFor="coaching-note">
          Add a note
          <textarea
            id="coaching-note"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            maxLength={2000}
            className="wc-input mt-2 min-h-24"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </button>
      </form>
      {ordered.length === 0 ? (
        <p className="text-sm text-muted">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {ordered.map((note) => (
            <li key={note.id} className="wc-card p-4">
              <p className="text-xs text-muted">
                {note.guideName} · {formatChicagoDateTime(note.createdAt)}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Tasks({
  memberId,
  tasks,
  today,
}: {
  memberId: string;
  tasks: ReturnType<typeof usePortal>["roster"][number]["tasks"];
  today: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const open = tasks
    .filter((task) => task.status === "open")
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const done = tasks.filter((task) => task.status === "done");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await addCoachingTaskAction(memberId, title, dueDate);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setTitle("");
    setDueDate("");
    router.refresh();
  }

  async function toggle(taskId: string, status: "open" | "done") {
    setError("");
    const result = await setCoachingTaskStatusAction(taskId, status);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Tasks</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          A short follow-up with an optional due date. Open or done. This is a reminder, not a
          financial instruction.
        </p>
      </div>
      <form onSubmit={onSubmit} className="wc-card space-y-3 p-5">
        <label className="block text-sm text-ink" htmlFor="task-title">
          Task
          <input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={200}
            className="wc-input mt-2"
          />
        </label>
        <label className="block text-sm text-ink" htmlFor="task-due">
          Due date (optional)
          <input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="wc-input mt-2 sm:max-w-xs"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Add task"}
        </button>
      </form>
      {open.length === 0 && done.length === 0 ? (
        <p className="text-sm text-muted">No tasks yet.</p>
      ) : (
        <ul className="space-y-3">
          {[...open, ...done].map((task) => {
            const overdue = task.status === "open" && task.dueDate !== "" && task.dueDate < today;
            return (
              <li key={task.id} className="wc-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className={task.status === "done" ? "text-sm text-muted" : "text-sm text-ink"}>
                    {task.title}
                  </p>
                  <p className={`mt-1 text-xs ${overdue ? "text-warning" : "text-muted"}`}>
                    {task.status === "done" ? "Done" : "Open"}
                    {task.dueDate ? ` · due ${task.dueDate}` : " · no due date"}
                    {task.source === "member" ? " · from the member" : ""}
                    {overdue ? " · past due" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="wc-btn wc-btn-ghost"
                  onClick={() => toggle(task.id, task.status === "done" ? "open" : "done")}
                >
                  {task.status === "done" ? "Reopen" : "Mark done"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
