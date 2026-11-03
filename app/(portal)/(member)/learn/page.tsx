import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LearnCatalog } from "@/components/learn-catalog";
import { learningPathsFor } from "@/lib/education-store";
import { requireMember } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Learn",
};

export const instant = false;

export default async function Page() {
  const member = await requireMember();
  if (!member) redirect("/login");
  const paths = await learningPathsFor(member.id);
  return <LearnCatalog paths={paths} />;
}
