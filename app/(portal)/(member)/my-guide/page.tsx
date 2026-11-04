import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CollaborationHub } from "@/components/collaboration-hub";
import { loadHubForMember, markHubRead } from "@/lib/hub-store";
import { requireMember } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Guide",
};

export const instant = false;

export default async function Page() {
  const member = await requireMember();
  if (!member) redirect("/login");
  const model = await loadHubForMember(member.id, member.name);
  await markHubRead(member.id, member.id);
  return <CollaborationHub model={model} />;
}
