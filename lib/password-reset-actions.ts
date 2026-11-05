"use server";

import { writeAudit } from "@/lib/audit";
import { portalOrigin } from "@/lib/portal-origin";
import { requestPasswordReset, resetPasswordWithToken } from "@/lib/password-reset-store";
import { resetRequestMessage } from "@/lib/password-reset";

export interface ResetRequestState {
  error: string;
  message: string;
}

export interface ResetPasswordState {
  error: string;
  done: boolean;
  mfa: boolean;
}

export async function requestPasswordResetAction(
  _previous: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const result = await requestPasswordReset({
    email: String(formData.get("email") ?? ""),
    origin: await portalOrigin(),
  });
  if (result.status === "accepted" && result.sent) {
    await writeAudit({
      actorUserId: result.userId,
      action: "password.reset_request",
      targetType: "user",
      targetId: result.userId,
      meta: { email: result.email },
    });
  }
  return resetRequestMessage(result);
}

export async function resetPasswordAction(
  _previous: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const result = await resetPasswordWithToken(String(formData.get("token") ?? ""), {
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!result.ok) return { error: result.error, done: false, mfa: false };
  await writeAudit({
    actorUserId: result.userId,
    action: "password.reset",
    targetType: "user",
    targetId: result.userId,
    meta: { email: result.email },
  });
  return { error: "", done: true, mfa: result.mfaEnabled };
}
