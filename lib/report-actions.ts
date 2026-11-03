"use server";

import { auth, isPortalRole } from "@/auth";
import { ensureCurrentMonthlyReport } from "@/lib/report-store";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function refreshMonthlyReportAction(): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !isPortalRole(user.role) || user.role !== "member") {
    return { ok: false, message: "Sign in as a member to refresh your Freedom Report." };
  }
  const saved = await ensureCurrentMonthlyReport(user.id);
  if (!saved) return { ok: false, message: "This month's report could not be saved." };
  return { ok: true };
}
