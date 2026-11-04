import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { UIMessage } from "ai";
import { ActionPlanCard } from "@/components/action-plan-card";
import { CoachChat } from "@/components/coach-chat";
import { PageHeader } from "@/components/page-header";
import { coachConfigured } from "@/lib/coach-config";
import { COACH_DISCLAIMER } from "@/lib/coach-plan";
import { loadMemberCoach } from "@/lib/coach-store";
import { chicagoMonthKey, formatMonthLabel } from "@/lib/month";
import { requireMember } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Freedom Coach",
};

export const instant = false;

export default async function Page() {
  const member = await requireMember();
  if (!member) redirect("/login");
  const monthKey = chicagoMonthKey();
  const record = await loadMemberCoach(member.id, monthKey);
  const configured = coachConfigured();
  const messages: UIMessage[] = record.messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.body }],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Freedom Coach"
        title="Ask what matters this month"
        lede="A coach that reads your Freedom Score, Freedom Gap, goals, check-ins, and lessons. It is here whenever you are signed in. It teaches. It does not give regulated advice."
      />
      <p role="note" className="rounded-2xl border border-gold/50 bg-surface px-4 py-3 text-sm leading-6 text-ink">
        {COACH_DISCLAIMER}
      </p>
      <ActionPlanCard plan={record.plan} monthLabel={formatMonthLabel(monthKey)} configured={configured} />
      <CoachChat configured={configured} initialMessages={messages} />
    </div>
  );
}
