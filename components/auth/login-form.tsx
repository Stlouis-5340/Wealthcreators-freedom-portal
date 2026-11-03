"use client";

import { useActionState } from "react";
import { cancelMfaAction, loginAction, type AuthFormState } from "@/lib/auth-actions";
import { demoAccounts } from "@/lib/demo-accounts";

const initial: AuthFormState = { error: "", message: "", mfaEmail: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.mfaEmail ? (
        <>
          <input type="hidden" name="email" value={state.mfaEmail} />
          <p className="text-sm leading-6 text-muted">
            {state.message || "Enter the code from your authenticator app."} Signed in as{" "}
            <span className="text-ink">{state.mfaEmail}</span>.
          </p>
          <label className="block text-sm">
            <span className="text-muted">Authenticator or recovery code</span>
            <input
              className="wc-input mt-1.5"
              name="totp"
              inputMode="text"
              autoComplete="one-time-code"
              required
              autoFocus
            />
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm">
            <span className="text-muted">Email</span>
            <input
              className="wc-input mt-1.5"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@wealthcreators.test"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Password</span>
            <input
              className="wc-input mt-1.5"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
        </>
      )}
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="wc-btn wc-btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : state.mfaEmail ? "Confirm code" : "Sign in"}
      </button>
      {state.mfaEmail ? (
        <button type="submit" formAction={cancelMfaAction} formNoValidate className="wc-btn wc-btn-ghost w-full">
          Use a different account
        </button>
      ) : null}
      <div className="rounded-xl border border-line bg-background px-3 py-3 text-xs leading-5 text-muted">
        <p className="font-medium text-ink">Demo accounts</p>
        <ul className="mt-2 space-y-2">
          {demoAccounts.map((account) => (
            <li key={account.id}>
              <span className="text-gold-muted">{account.title}.</span> {account.email}
              <span className="block font-mono text-ink">{account.password}</span>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
