"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import {
  abandonChallengeAction,
  addGroupMemberAction,
  createGroupAction,
  enrollChallengeAction,
  leaveGroupAction,
  setChecklistAction,
} from "@/lib/community-actions";
import { statusLabel } from "@/lib/challenges";
import type { MemberChallengePage } from "@/lib/community-store";
import { formatDate } from "@/lib/format";

export function ChallengesView({ data }: { data: MemberChallengePage }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [enrollments, setEnrollments] = useState(data.enrollments);
  const [catalog, setCatalog] = useState(data.catalog);
  const signature = JSON.stringify(data);
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setEnrollments(data.enrollments);
    setCatalog(data.catalog);
  }

  async function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setPending(true);
    setMessage("");
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setEnrollments(data.enrollments);
      setMessage(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Challenges"
        title="A set length of time, one commitment"
        lede="Choose a 30, 60, or 90 day challenge. Progress is a checklist you mark, or a figure the portal already keeps. Nothing here is an instruction to borrow, spend, or buy."
      />

      {message ? (
        <p className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink" role="alert">
          {message}
        </p>
      ) : null}

      {enrollments.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Your challenges</h2>
          {enrollments.map((enrollment) => (
            <article key={enrollment.id} className="wc-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="wc-eyebrow">{enrollment.durationDays} days</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">{enrollment.title}</h3>
                </div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                  {statusLabel(enrollment.status)}
                </p>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{enrollment.summary}</p>
              <p className="mt-4 text-sm text-ink">
                <span className="font-medium">{enrollment.progress}%</span>
                <span className="text-muted"> · window ends {formatDate(enrollment.endsOn)}</span>
              </p>
              <ProgressMeter value={enrollment.progress} />
              <p className="mt-3 text-sm leading-6 text-muted">{enrollment.memberNote}</p>

              {enrollment.checklist && enrollment.status !== "abandoned" ? (
                <ul className="mt-5 space-y-3">
                  {enrollment.checklist.map((item) => (
                    <li key={item.key} className="rounded-xl border border-line px-3 py-3">
                      <label className="flex items-start gap-3 text-sm text-ink">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={item.done}
                          disabled={pending}
                          onChange={() => {
                            const next = !item.done;
                            setEnrollments((current) =>
                              current.map((entry) =>
                                entry.id !== enrollment.id
                                  ? entry
                                  : {
                                      ...entry,
                                      checklist:
                                        entry.checklist?.map((check) =>
                                          check.key === item.key ? { ...check, done: next } : check,
                                        ) ?? null,
                                    },
                              ),
                            );
                            void run(() => setChecklistAction(enrollment.id, item.key, next));
                          }}
                        />
                        <span>
                          <span className="font-medium">{item.label}</span>
                          {item.body ? <span className="mt-1 block leading-6 text-muted">{item.body}</span> : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}

              <GroupBlock
                enrollment={enrollment}
                pending={pending}
                onCreate={(name) => run(() => createGroupAction(enrollment.challengeId, name))}
                onAdd={(groupId, email) => run(() => addGroupMemberAction(groupId, email))}
                onLeave={(groupId) => run(() => leaveGroupAction(groupId))}
              />

              {enrollment.status !== "abandoned" ? (
                <button
                  type="button"
                  className="wc-btn wc-btn-ghost mt-5"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm("Set this challenge aside? You can enroll again later.")) return;
                    void run(() => abandonChallengeAction(enrollment.id));
                  }}
                >
                  Set aside
                </button>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Catalog</h2>
        {catalog.map((item) => {
          const open = item.status === "active" || item.status === "completed";
          return (
            <article key={item.id} className="wc-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">{item.durationDays} days</p>
                <h3 className="mt-1 text-lg font-medium">{item.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{item.summary}</p>
              </div>
              <button
                type="button"
                className="wc-btn wc-btn-primary shrink-0"
                disabled={pending || open}
                onClick={() => void run(() => enrollChallengeAction(item.id))}
              >
                {item.status === "completed" ? "Completed" : item.status === "active" ? "Enrolled" : item.status === "abandoned" ? "Enroll again" : "Enroll"}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function GroupBlock({
  enrollment,
  pending,
  onCreate,
  onAdd,
  onLeave,
}: {
  enrollment: MemberChallengePage["enrollments"][number];
  pending: boolean;
  onCreate: (name: string) => void;
  onAdd: (groupId: string, email: string) => void;
  onLeave: (groupId: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  if (enrollment.status === "abandoned") return null;

  if (!enrollment.group) {
    return (
      <form
        className="mt-5 max-w-md space-y-3"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onCreate(name);
        }}
      >
        <p className="text-sm font-medium text-ink">Accountability circle</p>
        <p className="text-sm leading-6 text-muted">Optional. A name and the people enrolled in this same challenge.</p>
        <label className="block text-sm" htmlFor={`group-${enrollment.id}`}>
          Circle name
          <input
            id={`group-${enrollment.id}`}
            className="wc-input mt-1.5"
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit" className="wc-btn wc-btn-ghost" disabled={pending || name.trim().length < 2}>
          Start a circle
        </button>
      </form>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-line px-4 py-4">
      <p className="text-sm font-medium text-ink">{enrollment.group.name}</p>
      <ul className="mt-2 text-sm leading-6 text-muted">
        {enrollment.group.members.map((member) => (
          <li key={member.id}>{member.self ? `${member.name} (you)` : member.name}</li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onAdd(enrollment.group?.id ?? "", email);
          setEmail("");
        }}
      >
        <label className="sr-only" htmlFor={`email-${enrollment.group.id}`}>
          Email of someone already enrolled
        </label>
        <input
          id={`email-${enrollment.group.id}`}
          type="email"
          className="wc-input"
          placeholder="Email of someone already enrolled"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className="wc-btn wc-btn-ghost shrink-0" disabled={pending || email.trim() === ""}>
          Add
        </button>
      </form>
      <button
        type="button"
        className="mt-3 text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
        disabled={pending}
        onClick={() => onLeave(enrollment.group?.id ?? "")}
      >
        Leave circle
      </button>
    </div>
  );
}
