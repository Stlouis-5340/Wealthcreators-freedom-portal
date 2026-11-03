import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideCoachingReport } from "@/components/guide-coaching-report";
import { GuideLearningPanel } from "@/components/guide-learning-panel";
import { GuideSharedScenarios } from "@/components/guide-scenarios";
import { GuideWorkspace } from "@/components/guide-workspace";
import { MemberView } from "@/components/views/member-view";
import { recordGuideSummaryView } from "@/lib/guide-view";
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
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { memberId } = await params;
  const { month } = await searchParams;
  if (!isMemberId(memberId)) notFound();
  await recordGuideSummaryView(memberId);
  return (
    <MemberView memberId={memberId}>
      <GuideCoachingReport memberId={memberId} monthKey={month ?? null} />
      <GuideSharedScenarios memberId={memberId} />
      <GuideLearningPanel memberId={memberId} />
      <GuideWorkspace memberId={memberId} />
    </MemberView>
  );
}
