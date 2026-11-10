import { auth, isPortalRole } from "@/auth";
import { FreedomReport, ReportMissing } from "@/components/freedom-report";
import { chicagoMonthKey, isMonthKey } from "@/lib/month";
import { loadMonthlyReport } from "@/lib/report-store";
import { staffNeedsEnrollment } from "@/lib/staff-mfa";

export async function GuideCoachingReport({
  memberId,
  monthKey,
}: {
  memberId: string;
  monthKey?: string | null;
}) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !isPortalRole(user.role) || user.role !== "guide") return null;
  if (staffNeedsEnrollment(user.role, user.mfaEnabled === true)) return null;
  const current = chicagoMonthKey();
  const requested = monthKey && isMonthKey(monthKey) && monthKey <= current ? monthKey : current;
  const result = await loadMonthlyReport({
    viewerId: user.id,
    viewerRole: "guide",
    memberId,
    monthKey: requested,
    hrefForMonth: (month) => `/guide/${memberId}?month=${month}`,
  });
  if (result.status === "forbidden" || result.status === "invalid") return null;
  if (result.status === "missing") {
    return (
      <ReportMissing
        memberName={result.memberName}
        monthLabel={result.monthLabel}
        months={result.months}
        audience="guide"
      />
    );
  }
  return <FreedomReport model={result.model} variant="section" />;
}
