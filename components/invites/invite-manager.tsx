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
  copyUrl: string;
}

const initial: InviteFormState = { error: "", inviteUrl: "" };

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
}: {
  role: "guide" | "admin";
  invites: InviteListItem[];
  guides: { id: string; name: string }[];
}) {
  const [createState, createAction, createPending] = useActionState(inviteAction, initial);
  const [revokeState, revokeAction, revokePending] = useActionState(inviteAction, initial);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink">Invite a member</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          A single-use link, good for 7 days. The portal does not send email. Copy the link and send it
          yourself.
          {role === "guide"
            ? " When they accept, they join as a Member assigned to you."
            : " They join as a Member. Assign a Wealth Guide now, or leave that for later."}
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
          guides.length > 0 ? (
            <label className="block text-sm text-ink">
              Wealth Guide
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
                    {invite.guideName ? `Guide ${invite.guideName}` : "No Guide yet"}
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
