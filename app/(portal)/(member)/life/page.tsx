import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LifeView } from "@/components/views/life-view";
import { loadMemberLife } from "@/lib/community-store";
import { requireMember } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Life",
};

export const instant = false;

export default async function Page() {
  const member = await requireMember();
  if (!member) redirect("/login");
  const data = await loadMemberLife(member.id);
  return <LifeView data={data} />;
}
