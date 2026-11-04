import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LeadershipDashboard } from "@/components/admin/leadership-dashboard";
import { PageHeader } from "@/components/page-header";
import { loadLeadershipAnalytics } from "@/lib/leadership-store";
import { requireAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Leadership",
};

export const instant = false;

export default async function Page() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");
  const analytics = await loadLeadershipAnalytics();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Leadership analytics"
        lede="Whether the program is producing movement: Freedom Score, milestones, goals, check-ins, learning, challenges, and Guide follow-through. Aggregate only. Guides do not open this page."
      />
      <LeadershipDashboard analytics={analytics} />
    </div>
  );
}
