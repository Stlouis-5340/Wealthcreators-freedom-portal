"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type ResetRequestState } from "@/lib/password-reset-actions";

const initial: ResetRequestState = { error: "", message: "" };

export function ForgotPasswordForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  return (
    <form action={action} className="space-y-4">
      {emailConfigured ? null : (
        <p className="text-sm leading-6 text-muted" role="status">
          Email is not configured on this portal, so a reset link cannot be sent.
        </p>
      )}
      <label className="block text-sm">
        <span className="text-muted">Email</span>
        <input
          className="wc-input mt-1.5"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm leading-6 text-ink" role="status">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="wc-btn wc-btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}
