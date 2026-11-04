import type { Metadata } from "next";
import Link from "next/link";
import { PeopleManager } from "@/components/admin/people-manager";
import { PageHeader } from "@/components/page-header";
import { isPortalRole } from "@/auth";
import { integrityCensus } from "@/lib/plan-store";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "People",
};

export const instant = false;

export default async function Page() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");
  const [users, census] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mfaEnabled: true,
        guides: { select: { guide: { select: { id: true, name: true, role: true } } } },
      },
    }),
    integrityCensus(),
  ]);
  const people = users.flatMap((user) => {
    if (!isPortalRole(user.role)) return [];
    return [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        mfaEnabled: user.mfaEnabled,
        guides: user.guides
          .filter((assignment) => assignment.guide.role === "guide")
          .map((assignment) => ({ id: assignment.guide.id, name: assignment.guide.name })),
      },
    ];
  });
  const guides = people.filter((person) => person.role === "guide").map((person) => ({ id: person.id, name: person.name }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="People"
        lede="Roles, Guide assignments, and who can sign in. Pausing an account blocks the next sign-in. It does not delete a plan."
      />
      <p className="max-w-3xl text-sm leading-6 text-muted">
        Program outcomes are on{" "}
        <Link href="/admin/analytics" className="text-gold hover:text-gold-bright">
          Leadership analytics
        </Link>
        . This page stays people, roles, and sign-in.
      </p>
      <section className="grid gap-3 sm:grid-cols-3">
        <Count label="Members" value={String(census.members)} detail="Plans on the roster" />
        <Count
          label="Stale labels"
          value={String(census.staleLabels)}
          detail={`${census.membersWithStale} members have at least one`}
        />
        <Count
          label="Missing labels"
          value={String(census.missingLabels)}
          detail={`${census.membersWithMissing} members have at least one`}
        />
      </section>
      <p className="max-w-3xl text-sm leading-6 text-muted">
        Stale and missing use the same freshness labels already on each plan. A connected balance
        or a dated confirmation older than 14 days is stale. Missing means that figure has no lines.
        This is a count, not a ranking of Guides.
      </p>
      <PeopleManager people={people} guides={guides} viewerId={admin.id} />
    </div>
  );
}

function Count({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="wc-card px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}
