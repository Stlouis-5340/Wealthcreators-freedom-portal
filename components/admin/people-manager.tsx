"use client";

import { useActionState } from "react";
import { adminPeopleAction, type AdminFormState } from "@/lib/admin-actions";
import { roleTitle } from "@/lib/demo-accounts";
import type { Role } from "@/lib/types";

export interface AdminPerson {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mfaEnabled: boolean;
  guides: { id: string; name: string }[];
}

const initial: AdminFormState = { error: "" };

export function PeopleManager({
  people,
  guides,
  viewerId,
}: {
  people: AdminPerson[];
  guides: { id: string; name: string }[];
  viewerId: string;
}) {
  const [state, action, pending] = useActionState(adminPeopleAction, initial);

  return (
    <div className="space-y-4">
      {state.error ? (
        <p role="alert" className="rounded-2xl border border-danger/40 bg-surface px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <ul className="space-y-4">
        {people.map((person) => (
          <li
            key={`${person.id}:${person.role}:${person.isActive}:${person.guides.map((guide) => guide.id).join(",")}`}
            className="wc-card space-y-4 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{person.name}</h2>
                <p className="text-sm text-muted">{person.email}</p>
              </div>
              <p className="text-xs uppercase tracking-[0.14em] text-gold-muted">
                {roleTitle(person.role)} · {person.isActive ? "Active" : "Paused"} · Authenticator{" "}
                {person.mfaEnabled ? "on" : "off"}
              </p>
            </div>

            <form action={action} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="intent" value="role" />
              <input type="hidden" name="userId" value={person.id} />
              <label className="text-sm text-ink">
                Role
                <select name="role" defaultValue={person.role} className="wc-input mt-1.5 sm:w-40" disabled={person.id === viewerId}>
                  <option value="member">Member</option>
                  <option value="guide">Guide</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button type="submit" className="wc-btn wc-btn-ghost" disabled={pending || person.id === viewerId}>
                Save role
              </button>
            </form>

            <form action={action}>
              <input type="hidden" name="intent" value="active" />
              <input type="hidden" name="userId" value={person.id} />
              <input type="hidden" name="active" value={person.isActive ? "false" : "true"} />
              <button type="submit" className="wc-btn wc-btn-ghost" disabled={pending || person.id === viewerId}>
                {person.isActive ? "Pause sign-in" : "Turn sign-in back on"}
              </button>
            </form>

            {person.role === "member" ? (
              <div className="space-y-3 border-t border-line pt-4">
                <p className="text-sm text-ink">Wealth Guides</p>
                {person.guides.length === 0 ? (
                  <p className="text-sm text-muted">No Guide is assigned.</p>
                ) : (
                  <ul className="space-y-2">
                    {person.guides.map((guide) => (
                      <li key={guide.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-ink">{guide.name}</span>
                        <form action={action}>
                          <input type="hidden" name="intent" value="unassign" />
                          <input type="hidden" name="memberId" value={person.id} />
                          <input type="hidden" name="guideId" value={guide.id} />
                          <button type="submit" className="wc-btn wc-btn-ghost" disabled={pending}>
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                {guides.length > 0 ? (
                  <form action={action} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="intent" value="assign" />
                    <input type="hidden" name="memberId" value={person.id} />
                    <label className="text-sm text-ink">
                      Assign a Guide
                      <select name="guideId" className="wc-input mt-1.5 sm:w-56" defaultValue={guides[0]?.id}>
                        {guides.map((guide) => (
                          <option key={guide.id} value={guide.id}>
                            {guide.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
                      Assign
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-muted">Add a Guide role before assigning someone.</p>
                )}
                <p className="text-xs leading-5 text-muted">
                  A new assignment starts with score, totals, goals, check-ins, and tasks visible.
                  The member can turn score, totals, goals, and check-ins off. Category spending stays off.
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
