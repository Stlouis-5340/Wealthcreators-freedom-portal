import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LegacyView } from "@/components/views/legacy-view";
import { loadMemberLegacy } from "@/lib/legacy-store";
import { requireMember } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Legacy",
};

export const instant = false;

export default async function Page() {
  const member = await requireMember();
  if (!member) redirect("/login");
  const data = await loadMemberLegacy(member.id);
  return <LegacyView data={data} />;
}
