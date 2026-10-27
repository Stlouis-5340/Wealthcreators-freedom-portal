import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideAccess } from "@/components/guide-access";
import { MemberView } from "@/components/views/member-view";
import { isMemberId, memberIds } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Member",
};

export const instant = false;

export function generateStaticParams() {
  return memberIds.map((memberId) => ({ memberId }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  if (!isMemberId(memberId)) notFound();
  return (
    <GuideAccess>
      <MemberView memberId={memberId} />
    </GuideAccess>
  );
}
