import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChallengesView } from "@/components/views/challenges-view";
import { loadMemberChallengePage } from "@/lib/community-store";
import { requireMember } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Challenges",
};

export const instant = false;

export default async function Page() {
  const member = await requireMember();
  if (!member) redirect("/login");
  const data = await loadMemberChallengePage(member.id);
  return <ChallengesView data={data} />;
}
