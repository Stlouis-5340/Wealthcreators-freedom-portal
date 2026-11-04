import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RecognitionView } from "@/components/views/recognition-view";
import { loadMemberRecognition } from "@/lib/community-store";
import { requireMember } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Recognition",
};

export const instant = false;

export default async function Page() {
  const member = await requireMember();
  if (!member) redirect("/login");
  const data = await loadMemberRecognition(member.id);
  return <RecognitionView data={data} />;
}
