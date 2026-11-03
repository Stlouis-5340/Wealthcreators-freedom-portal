import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth, isPortalRole } from "@/auth";
import { FreedomReport, ReportMissing } from "@/components/freedom-report";
import { loadMonthlyReport } from "@/lib/report-store";

export const metadata: Metadata = {
  title: "Freedom Report",
};

export const instant = false;

export default async function Page({
  params,
}: {
  params: Promise<{ memberId: string; month: string }>;
}) {
  const { memberId, month } = await params;
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !isPortalRole(user.role)) redirect("/login");
  const result = await loadMonthlyReport({
    viewerId: user.id,
    viewerRole: user.role,
    memberId,
    monthKey: month,
  });
  if (result.status === "invalid" || result.status === "forbidden") notFound();
  if (result.status === "missing") {
    return (
      <ReportMissing
        memberName={result.memberName}
        monthLabel={result.monthLabel}
        months={result.months}
        audience={result.audience}
      />
    );
  }
  return <FreedomReport model={result.model} variant="page" />;
}
