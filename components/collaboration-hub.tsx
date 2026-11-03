"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import {
  addAgendaItemAction,
  addMemberTaskAction,
  addSessionSummaryAction,
  postHubMessageAction,
  setMemberTaskStatusAction,
  updateSchedulingUrlAction,
} from "@/lib/hub-actions";
import type { HubModel } from "@/lib/hub";
import { formatDate } from "@/lib/format";
import { chicagoDateISO, formatChicagoDateTime } from "@/lib/week";

export function CollaborationHub({ model, heading = true }: { model: HubModel; heading?: boolean }) {
  const memberView = model.viewerRole === "member";

  return (
    <div className="space-y-8">
      {heading ? (
        <PageHeader
          eyebrow="Together"
          title="Your Guide"
          lede={
            model.guideName
              ? `A shared workspace with ${model.guideName}. Action items, a short thread, session notes, and what you want to cover next. Not a live chat, and not a place for bank details.`
              : "When a Wealth Guide is assigned, this page holds action items, a short thread, and session notes."
          }
        />
      ) : (
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Shared workspace</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Messages, session notes, and agenda items for {model.memberName}. Action items stay in Tasks
            on this page. Bank names, account numbers, and connection tokens do not belong here.
          </p>
        </div>
      )}

      <Scheduling model={model} />
      {memberView ? <Tasks model={model} /> : null}
      <Messages model={model} />
      <Sessions model={model} />
      <Agenda model={model} />
    </div>
  );
}

function Scheduling({ model }: { model: HubModel }) {
  const router = useRouter();
  const [url, setUrl] = useState(model.schedulingUrl);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const guide = model.viewerRole === "guide";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await updateSchedulingUrlAction(url);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <section className="wc-card space-y-3 p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Schedule</h2>
      {model.schedulingUrl ? (
        <p className="text-sm leading-6 text-ink">
          <a
            href={model.schedulingUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-gold hover:text-gold-bright"
          >
            Open the scheduling page
          </a>
          <span className="text-muted">
            {" "}
            · This leaves the portal. The demo link is a placeholder until a real Calendly page is saved.
          </span>
        </p>
      ) : (
        <p className="text-sm leading-6 text-muted">No scheduling link yet.</p>
      )}
      {guide ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm text-ink" htmlFor="scheduling-url">
            Calendly or other scheduling link
            <input
              id="scheduling-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              className="wc-input mt-2"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <button type="submit" className="wc-btn wc-btn-ghost" disabled={pending}>
            {pending ? "Saving…" : "Save link"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function Tasks({ model }: { model: HubModel }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const today = chicagoDateISO();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await addMemberTaskAction(title, dueDate);
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
    const result = await setMemberTaskStatusAction(taskId, status);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Action items</h2>
      <p className="max-w-3xl text-sm leading-6 text-muted">
        You and your Guide share this list. Either of you can mark one done. It is a reminder, not an instruction to move money.
      </p>
      <form onSubmit={onSubmit} className="wc-card space-y-3 p-5">
        <label className="block text-sm text-ink" htmlFor="hub-task">
          Add an item
          <input
            id="hub-task"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={200}
            className="wc-input mt-2"
          />
        </label>
        <label className="block text-sm text-ink" htmlFor="hub-task-due">
          Due date (optional)
          <input
            id="hub-task-due"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="wc-input mt-2 sm:max-w-xs"
          />
        </label>
        <button type="submit" className="wc-btn wc-btn-primary" disabled={pending || !model.guideName}>
          {pending ? "Saving…" : "Add item"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {model.tasks.length === 0 ? (
        <p className="text-sm text-muted">No action items yet.</p>
      ) : (
        <ul className="space-y-3">
          {model.tasks.map((task) => {
            const overdue = task.status === "open" && task.dueDate !== "" && task.dueDate < today;
            return (
              <li key={task.id} className="wc-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className={task.status === "done" ? "text-sm text-muted line-through" : "text-sm text-ink"}>
                    {task.title}
                  </p>
                  <p className={`mt-1 text-xs ${overdue ? "text-warning" : "text-muted"}`}>
                    {task.status === "done" ? "Done" : "Open"}
                    {task.dueDate ? ` · due ${task.dueDate}` : " · no due date"}
                    {task.source === "member" ? " · from you" : " · from your Guide"}
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

function Messages({ model }: { model: HubModel }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await postHubMessageAction(model.memberId, body);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Messages</h2>
      <p className="max-w-3xl text-sm leading-6 text-muted">
        A short thread between sessions. Keep it to the plan and the next conversation.
      </p>
      <ul className="space-y-3">
        {model.messages.length === 0 ? (
          <li className="text-sm text-muted">No messages yet.</li>
        ) : (
          model.messages.map((message) => (
            <li key={message.id} className="wc-card p-4">
              <p className="text-xs text-muted">
                {message.authorName}
                {message.authorRole === "guide" ? " · Wealth Guide" : " · Member"} ·{" "}
                {formatChicagoDateTime(message.createdAt)}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink">{message.body}</p>
            </li>
          ))
        )}
      </ul>
      <form onSubmit={onSubmit} className="wc-card space-y-3 p-5">
        <label className="block text-sm text-ink" htmlFor="hub-message">
          Add a note
          <textarea
            id="hub-message"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            maxLength={500}
            className="wc-input mt-2 min-h-24"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button type="submit" className="wc-btn wc-btn-primary" disabled={pending || !model.guideName}>
          {pending ? "Sending…" : "Send note"}
        </button>
      </form>
    </section>
  );
}

function Sessions({ model }: { model: HubModel }) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [heldAt, setHeldAt] = useState(chicagoDateISO());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const guide = model.viewerRole === "guide";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await addSessionSummaryAction(model.memberId, summary, nextSteps, heldAt);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSummary("");
    setNextSteps("");
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Session notes</h2>
      <p className="max-w-3xl text-sm leading-6 text-muted">
        A summary after you meet. It is coaching context, not minutes of a transaction.
      </p>
      {model.sessions.length === 0 ? (
        <p className="text-sm text-muted">No session notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {model.sessions.map((session) => (
            <li key={session.id} className="wc-card p-4">
              <p className="text-xs text-muted">
                {session.guideName} · {formatDate(session.heldAt)}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink">{session.summary}</p>
              {session.nextSteps ? (
                <p className="mt-2 text-sm leading-6 text-muted">Next: {session.nextSteps}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {guide ? (
        <form onSubmit={onSubmit} className="wc-card space-y-3 p-5">
          <label className="block text-sm text-ink" htmlFor="session-date">
            Date held
            <input
              id="session-date"
              type="date"
              value={heldAt}
              onChange={(event) => setHeldAt(event.target.value)}
              required
              className="wc-input mt-2 sm:max-w-xs"
            />
          </label>
          <label className="block text-sm text-ink" htmlFor="session-summary">
            Summary
            <textarea
              id="session-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              required
              maxLength={2000}
              className="wc-input mt-2 min-h-24"
            />
          </label>
          <label className="block text-sm text-ink" htmlFor="session-next">
            Next steps
            <textarea
              id="session-next"
              value={nextSteps}
              onChange={(event) => setNextSteps(event.target.value)}
              maxLength={1000}
              className="wc-input mt-2 min-h-20"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save session note"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function Agenda({ model }: { model: HubModel }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const member = model.viewerRole === "member";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await addAgendaItemAction(body);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Next session agenda</h2>
      <p className="max-w-3xl text-sm leading-6 text-muted">
        {member
          ? "Propose what you want to cover. One sentence is enough."
          : "Items the member asked to cover. Read only."}
      </p>
      {model.agenda.length === 0 ? (
        <p className="text-sm text-muted">No agenda items yet.</p>
      ) : (
        <ul className="space-y-3">
          {model.agenda.map((item) => (
            <li key={item.id} className="wc-card p-4">
              <p className="text-sm leading-6 text-ink">{item.body}</p>
              <p className="mt-2 text-xs text-muted">{formatChicagoDateTime(item.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
      {member ? (
        <form onSubmit={onSubmit} className="wc-card space-y-3 p-5">
          <label className="block text-sm text-ink" htmlFor="agenda-item">
            Agenda item
            <input
              id="agenda-item"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              maxLength={300}
              className="wc-input mt-2"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <button type="submit" className="wc-btn wc-btn-primary" disabled={pending || !model.guideName}>
            {pending ? "Saving…" : "Add to agenda"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
