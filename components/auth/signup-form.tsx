"use client";

import { useActionState } from "react";
import { signupAction, type AuthFormState } from "@/lib/auth-actions";

const initial: AuthFormState = { error: "", message: "" };

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="text-muted">Name</span>
        <input className="wc-input mt-1.5" name="name" type="text" autoComplete="name" required />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Email</span>
        <input
          className="wc-input mt-1.5"
          name="email"
          type="email"
          autoComplete="email"
          required
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
      {state.message ? (
        <p className="text-sm leading-6 text-gold-bright" role="status">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="wc-btn wc-btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Request access"}
      </button>
    </form>
  );
}
