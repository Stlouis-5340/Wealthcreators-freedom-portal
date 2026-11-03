"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { beginMfaSetup, confirmMfaSetup, disableMfa } from "@/lib/mfa";
import { requireActor } from "@/lib/permissions";

export interface MfaStartState {
  error: string;
  qrDataUrl: string;
  manualKey: string;
}

export interface MfaConfirmState {
  error: string;
  recoveryCodes: string[];
}

export interface MfaDisableState {
  error: string;
  turnedOff: boolean;
}

const startIdle: MfaStartState = { error: "", qrDataUrl: "", manualKey: "" };
const confirmIdle: MfaConfirmState = { error: "", recoveryCodes: [] };

export async function startMfaEnrollAction(
  previous: MfaStartState,
  formData: FormData,
): Promise<MfaStartState> {
  void previous;
  void formData;
  const actor = await requireActor();
  if (!actor) return { ...startIdle, error: "Sign in to set up an authenticator app." };
  try {
    const setup = await beginMfaSetup(actor.id, actor.email);
    return { error: "", qrDataUrl: setup.qrDataUrl, manualKey: setup.manualKey };
  } catch {
    return { ...startIdle, error: "The authenticator setup could not start. Check that the portal secret is set." };
  }
}

export async function confirmMfaEnrollAction(
  _previous: MfaConfirmState,
  formData: FormData,
): Promise<MfaConfirmState> {
  const actor = await requireActor();
  if (!actor) return { ...confirmIdle, error: "Sign in to confirm the authenticator app." };
  const code = String(formData.get("code") ?? "");
  const result = await confirmMfaSetup(actor.id, code);
  if (!result.ok) {
    return { ...confirmIdle, error: "That code did not match. Use the 6-digit code from the new setup." };
  }
  await writeAudit({
    actorUserId: actor.id,
    action: "mfa.enroll",
    targetType: "user",
    targetId: actor.id,
    meta: { role: actor.role },
  });
  revalidatePath("/security");
  return { error: "", recoveryCodes: result.recoveryCodes };
}

export async function disableMfaAction(
  _previous: MfaDisableState,
  formData: FormData,
): Promise<MfaDisableState> {
  const actor = await requireActor();
  if (!actor) return { error: "Sign in to turn off the authenticator app.", turnedOff: false };
  const code = String(formData.get("code") ?? "");
  const ok = await disableMfa(actor.id, code);
  if (!ok) return { error: "That code did not match, so the authenticator stays on.", turnedOff: false };
  await writeAudit({
    actorUserId: actor.id,
    action: "mfa.disable",
    targetType: "user",
    targetId: actor.id,
    meta: { role: actor.role },
  });
  revalidatePath("/security");
  return { error: "", turnedOff: true };
}
