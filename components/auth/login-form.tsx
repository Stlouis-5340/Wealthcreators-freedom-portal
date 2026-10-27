"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/lib/auth-actions";
import { demoAccounts } from "@/lib/demo-accounts";

const initial: AuthFormState = { error: "", message: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-4">
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
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="wc-btn wc-btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
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
