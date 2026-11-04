import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export const AUDIT_ACTIONS = [
  "guide.view_summary",
  "guide.open_report",
  "admin.change_role",
  "admin.assign_guide",
  "admin.unassign_guide",
  "member.update_grant",
  "admin.deactivate",
  "admin.reactivate",
  "mfa.enroll",
  "mfa.disable",
  "member.share_scenario",
  "member.unshare_scenario",
  "guide.view_scenarios",
  "member.generate_action_plan",
  "member.regenerate_action_plan",
  "guide.view_coach",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_LABELS: Record<AuditAction, string> = {
  "guide.view_summary": "Guide opened a member summary",
  "guide.open_report": "Guide opened a Freedom Report",
  "admin.change_role": "Role changed",
  "admin.assign_guide": "Guide assigned",
  "admin.unassign_guide": "Guide unassigned",
  "member.update_grant": "Guide visibility changed",
  "admin.deactivate": "Account paused",
  "admin.reactivate": "Account turned back on",
  "mfa.enroll": "Authenticator turned on",
  "mfa.disable": "Authenticator turned off",
  "member.share_scenario": "Member shared a scenario",
  "member.unshare_scenario": "Member hid a scenario from the Guide",
  "guide.view_scenarios": "Guide opened shared scenarios",
  "member.generate_action_plan": "Member wrote a Freedom Action Plan",
  "member.regenerate_action_plan": "Member refreshed a Freedom Action Plan",
  "guide.view_coach": "Guide opened coach insights",
};

const blockedKey = /token|secret|password|mask|plaid|hash|recovery|otp|code/i;

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

export function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (blockedKey.test(key)) continue;
    if (Array.isArray(value)) {
      clean[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? sanitizeMeta(item as Record<string, unknown>)
          : typeof item === "string" && looksSecret(item)
            ? undefined
            : item,
      );
      continue;
    }
    if (value && typeof value === "object") {
      clean[key] = sanitizeMeta(value as Record<string, unknown>);
      continue;
    }
    if (typeof value === "string" && looksSecret(value)) continue;
    clean[key] = value;
  }
  return clean;
}

function looksSecret(value: string): boolean {
  return /access[_-]?token|passwordHash|mfaSecret|BEGIN [A-Z ]*PRIVATE KEY/i.test(value);
}

async function requestIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const raw = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
    return raw.slice(0, 64);
  } catch {
    return "";
  }
}

export async function writeAudit(input: {
  actorUserId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const meta = JSON.stringify(sanitizeMeta(input.meta ?? {}));
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType.slice(0, 40),
      targetId: input.targetId.slice(0, 200),
      meta: meta.length > 4000 ? "{}" : meta,
      ip: await requestIp(),
    },
  });
}
