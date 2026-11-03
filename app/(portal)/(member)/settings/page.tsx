import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { GuideAccessForm } from "@/components/settings/guide-access-form";
import { parseGuideAccess } from "@/lib/access";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Guide access",
};

export const instant = false;

export default async function Page() {
  const member = await requireMember();
  if (!member) redirect("/login");
  const assignments = await prisma.guideAssignment.findMany({
    where: { memberId: member.id },
    orderBy: { sort: "asc" },
    include: {
      guide: { select: { id: true, name: true, role: true } },
    },
  });
  const guides = assignments.filter((assignment) => assignment.guide.role === "guide");
  const grants = await prisma.guideAccessGrant.findMany({
    where: { memberId: member.id, revokedAt: null, guideId: { in: guides.map((item) => item.guideId) } },
    orderBy: { grantedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your plan"
        title="What your Guide can see"
        lede="Your Wealth Guide coaches from the parts you leave on. The defaults cover score, totals, goals, and check-ins. Nothing here is a promise about returns."
      />
      {guides.length === 0 ? (
        <p className="wc-card px-5 py-6 text-sm leading-6 text-muted">
          You do not have a Wealth Guide assigned yet. When one is assigned, you can choose what they see.
        </p>
      ) : (
        guides.map((assignment) => {
          const grant = grants.find((item) => item.guideId === assignment.guideId);
          return (
            <GuideAccessForm
              key={assignment.guideId}
              guideId={assignment.guideId}
              guideName={assignment.guide.name}
              access={parseGuideAccess(grant?.scopes)}
            />
          );
        })
      )}
    </div>
  );
}
