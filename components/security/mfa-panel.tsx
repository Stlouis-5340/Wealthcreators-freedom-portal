"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  confirmMfaEnrollAction,
  disableMfaAction,
  startMfaEnrollAction,
  type MfaConfirmState,
  type MfaDisableState,
  type MfaStartState,
} from "@/lib/mfa-actions";

const startInitial: MfaStartState = { error: "", qrDataUrl: "", manualKey: "" };
const confirmInitial: MfaConfirmState = { error: "", recoveryCodes: [] };
const disableInitial: MfaDisableState = { error: "", turnedOff: false };

export function MfaPanel({
  enabled,
  prompted,
}: {
  enabled: boolean;
  /** Guides and admins must enroll. Members keep this optional. */
  prompted: boolean;
}) {
  const [start, startAction, startPending] = useActionState(startMfaEnrollAction, startInitial);
  const [confirm, confirmAction, confirmPending] = useActionState(confirmMfaEnrollAction, confirmInitial);
  const [disable, disableAction, disablePending] = useActionState(disableMfaAction, disableInitial);
  const on = enabled && confirm.recoveryCodes.length === 0 && !disable.turnedOff;

  return (
    <div className="space-y-6">
      {prompted && !on ? (
        <p className="rounded-2xl border border-gold/50 bg-surface px-4 py-3 text-sm leading-6 text-muted">
          <span className="font-medium text-ink">Guides and admins must enroll.</span> This is the only
          portal page you can use until an authenticator app is on. After that, every sign-in asks for a
          6-digit code.
        </p>
      ) : null}

      {confirm.recoveryCodes.length > 0 ? (
        <section className="wc-card space-y-3 p-5">
          <h2 className="text-lg font-semibold text-ink">Save these recovery codes</h2>
          <p className="text-sm leading-6 text-muted">
            Each code works once if you lose the authenticator app. This screen will not show them again.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {confirm.recoveryCodes.map((code) => (
              <li key={code} className="rounded-xl bg-background px-3 py-2 font-mono text-sm text-ink">
                {code}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {on ? (
        <form action={disableAction} className="wc-card space-y-3 p-5">
          <h2 className="text-lg font-semibold text-ink">Authenticator is on</h2>
          <p className="text-sm leading-6 text-muted">
            Sign-in asks for a 6-digit code after the password. Enter a current code or a recovery code
            to turn it off.
            {prompted
              ? " Turning it off closes the rest of the portal until you enroll again."
              : ""}
          </p>
          <label className="block text-sm text-ink">
            Code
            <input name="code" required autoComplete="one-time-code" className="wc-input mt-1.5 sm:max-w-xs" />
          </label>
          {disable.error ? (
            <p role="alert" className="text-sm text-danger">
              {disable.error}
            </p>
          ) : null}
          <button type="submit" className="wc-btn wc-btn-ghost" disabled={disablePending}>
            {disablePending ? "Turning off…" : "Turn off authenticator"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <form action={startAction} className="wc-card space-y-3 p-5">
            <h2 className="text-lg font-semibold text-ink">Set up an authenticator app</h2>
            <p className="text-sm leading-6 text-muted">
              Use an app such as the one on your phone. Scan the code, then enter the 6-digit number it
              shows. Members can skip this. It is optional for them.
            </p>
            {start.error ? (
              <p role="alert" className="text-sm text-danger">
                {start.error}
              </p>
            ) : null}
            <button type="submit" className="wc-btn wc-btn-primary" disabled={startPending}>
              {startPending ? "Preparing…" : start.qrDataUrl ? "Start over" : "Show setup code"}
            </button>
            {start.qrDataUrl ? (
              <div className="space-y-3">
                <Image
                  src={start.qrDataUrl}
                  alt="QR code for the Wealth Creators authenticator setup"
                  width={240}
                  height={240}
                  unoptimized
                />
                <p className="text-sm text-muted">
                  Or enter this key by hand: <span className="font-mono text-ink">{start.manualKey}</span>
                </p>
              </div>
            ) : null}
          </form>
          {start.qrDataUrl ? (
            <form action={confirmAction} className="wc-card space-y-3 p-5">
              <label className="block text-sm text-ink">
                6-digit code
                <input name="code" required inputMode="numeric" autoComplete="one-time-code" className="wc-input mt-1.5 sm:max-w-xs" />
              </label>
              {confirm.error ? (
                <p role="alert" className="text-sm text-danger">
                  {confirm.error}
                </p>
              ) : null}
              <button type="submit" className="wc-btn wc-btn-primary" disabled={confirmPending}>
                {confirmPending ? "Checking…" : "Turn on authenticator"}
              </button>
            </form>
          ) : null}
        </div>
      )}
      {disable.turnedOff ? (
        <p className="text-sm text-success">
          {prompted
            ? "Authenticator is off. Enroll again before the rest of the portal will open."
            : "Authenticator is off. Password sign-in works on its own again."}
        </p>
      ) : null}
    </div>
  );
}
