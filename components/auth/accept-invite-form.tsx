"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signOutAction } from "@/lib/auth-actions";
import { acceptInviteAction, type AcceptInviteState } from "@/lib/invite-actions";

const initial: AcceptInviteState = { error: "", done: false };

export function AcceptInviteForm({
  token,
  email,
  name,
  signedIn,
}: {
  token: string;
  email: string;
  name: string;
  signedIn: boolean;
}) {
  const [state, action, pending] = useActionState(acceptInviteAction, initial);

  if (state.done) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-ink" role="status">
          The member account for <span className="font-medium">{email}</span> is ready.
          {signedIn
            ? " Sign out, then sign in with this email and the password you just set."
            : " Sign in with this email and the password you just set."}
        </p>
        {signedIn ? (
          <form action={signOutAction}>
            <button type="submit" className="wc-btn wc-btn-primary w-full">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/login" className="wc-btn wc-btn-primary w-full">
            Sign in
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-ink">
        Email <span className="font-medium">{email}</span>
      </p>
      <label className="block text-sm">
        <span className="text-muted">Name</span>
        <input
          className="wc-input mt-1.5"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={name}
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Password</span>
        <input
          className="wc-input mt-1.5"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Confirm password</span>
        <input
          className="wc-input mt-1.5"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="wc-btn wc-btn-primary w-full" disabled={pending}>
        {pending ? "Creating…" : "Create sign-in"}
      </button>
    </form>
  );
}
