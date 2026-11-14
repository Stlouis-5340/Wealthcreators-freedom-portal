"use client";

import { useState, useActionState } from "react";
import { inviteAction, type InviteFormState } from "@/lib/invite-actions";

export interface InviteListItem {
  id: string;
  email: string;
  name: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  guideName: string;
  createdByName: string;
  role: "member" | "guide" | "admin";
  copyUrl: string;
}

const initial: InviteFormState = { error: "", inviteUrl: "", emailNote: "" };

const statusLabel: Record<InviteListItem["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
};

export function InviteManager({
  role,
  invites,
  guides,
  emailConfigured,
}: {
  role: "guide" | "admin";
  invites: InviteListItem[];
  guides: { id: string; name: string }[];
  emailConfigured: boolean;
}) {
  const [createState, createAction, createPending] = useActionState(inviteAction, initial);
  const [revokeState, revokeAction, revokePending] = useActionState(inviteAction, initial);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink">Invite a member</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          A single-use link, good for 7 days.{" "}
          {emailConfigured
            ? "Email this link is on by default. The link is still shown once so you can copy it."
            : "Email is not configured on this portal. The invite still works. Copy the link and send it yourself."}{" "}
          {role === "guide"
            ? "When they accept, they join as a Member assigned to you."
            : "They join with the role you choose. A Member can be assigned a Wealth Guide now or later. A Wealth Guide or Admin must set up an authenticator app on first sign-in."}
        </p>
      </div>

      {createState.error ? (
        <p role="alert" className="rounded-2xl border border-danger/40 bg-surface px-4 py-3 text-sm text-danger">
          {createState.error}
        </p>
      ) : null}

      {createState.inviteUrl ? (
        <div className="rounded-2xl border border-gold/40 bg-surface px-4 py-4">
          <p className="text-sm font-medium text-ink">Copy this link now. It is shown only this once.</p>
          {createState.emailNote ? (
            <p className="mt-2 text-sm leading-6 text-muted" role="status">
              {createState.emailNote}
            </p>
          ) : null}
          <CopyField url={createState.inviteUrl} />
        </div>
      ) : null}

      <form action={createAction} className="wc-card space-y-4 p-5">
        <input type="hidden" name="intent" value="create" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-ink">
            Email
            <input
              className="wc-input mt-1.5"
              name="email"
              type="email"
              autoComplete="off"
              required
              maxLength={254}
            />
          </label>
          <label className="block text-sm text-ink">
            Name
            <input
              className="wc-input mt-1.5"
              name="name"
              type="text"
              autoComplete="off"
              maxLength={80}
              placeholder="Optional"
            />
          </label>
        </div>
        {role === "admin" ? (
          <label className="block text-sm text-ink">
            Role
            <select name="role" className="wc-input mt-1.5 sm:max-w-sm" defaultValue="member">
              <option value="member">Member</option>
              <option value="guide">Wealth Guide</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        ) : null}
        {role === "admin" ? (
          guides.length > 0 ? (
            <label className="block text-sm text-ink">
              Wealth Guide (Members only)
              <select name="guideId" className="wc-input mt-1.5 sm:max-w-sm" defaultValue="">
                <option value="">Assign later</option>
                {guides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-muted">No active Wealth Guide yet. The member can be assigned later.</p>
          )
        ) : null}
        {emailConfigured ? (
          <label className="flex items-start gap-3 text-sm text-ink">
            <input type="checkbox" name="sendEmail" value="yes" defaultChecked className="mt-1 h-4 w-4 accent-gold" />
            <span>
              Email this link
              <span className="mt-1 block text-muted">On by default. Turn it off to copy the link only.</span>
            </span>
          </label>
        ) : (
          <p className="text-sm leading-6 text-muted" role="status">
            Email is not configured. You can still create the link and copy it.
          </p>
        )}
        <button type="submit" className="wc-btn wc-btn-primary" disabled={createPending}>
          {createPending ? "Creating…" : "Create invite link"}
        </button>
      </form>

      {revokeState.error ? (
        <p role="alert" className="rounded-2xl border border-danger/40 bg-surface px-4 py-3 text-sm text-danger">
          {revokeState.error}
        </p>
      ) : null}

      {invites.length === 0 ? (
        <p className="text-sm text-muted">No invites yet.</p>
      ) : (
        <ul className="space-y-3">
          {invites.map((invite) => (
            <li key={invite.id} className="wc-card space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{invite.name || invite.email}</p>
                  {invite.name ? <p className="text-sm text-muted">{invite.email}</p> : null}
                  <p className="mt-1 text-xs text-muted">
                    {invite.role === "admin"
                      ? "Admin"
                      : invite.role === "guide"
                        ? "Wealth Guide"
                        : invite.guideName
                          ? `Guide ${invite.guideName}`
                          : "No Guide yet"}
                    {role === "admin" ? ` · Created by ${invite.createdByName}` : ""}
                    {" · "}
                    {invite.status === "pending" ? "Expires" : "Was due"} {invite.expiresAt}
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.14em] text-gold-muted">{statusLabel[invite.status]}</p>
              </div>
              {invite.copyUrl ? (
                <div>
                  <p className="text-xs text-muted">Sample invite. This preview link can be copied again.</p>
                  <CopyField url={invite.copyUrl} />
                </div>
              ) : null}
              {invite.status === "pending" ? (
                <form action={revokeAction}>
                  <input type="hidden" name="intent" value="revoke" />
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button type="submit" className="wc-btn wc-btn-ghost" disabled={revokePending}>
                    Revoke
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CopyField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        readOnly
        value={url}
        className="wc-input font-mono text-xs"
        aria-label="Invite link"
        onFocus={(event) => event.currentTarget.select()}
      />
      <button
        type="button"
        className="wc-btn wc-btn-ghost shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
