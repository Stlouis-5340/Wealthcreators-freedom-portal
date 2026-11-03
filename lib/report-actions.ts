"use server";

import { requireMember } from "@/lib/permissions";
import { ensureCurrentMonthlyReport } from "@/lib/report-store";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function refreshMonthlyReportAction(): Promise<ActionResult> {
  const user = await requireMember();
  if (!user) {
    return { ok: false, message: "Sign in as a member to refresh your Freedom Report." };
  }
  const saved = await ensureCurrentMonthlyReport(user.id);
  if (!saved) return { ok: false, message: "This month's report could not be saved." };
  return { ok: true };
}
