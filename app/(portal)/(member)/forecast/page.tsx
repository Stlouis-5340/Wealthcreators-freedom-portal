import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForecastView } from "@/components/views/forecast-view";
import { requireMember } from "@/lib/permissions";
import { listMemberScenarios } from "@/lib/scenario-store";

export const metadata: Metadata = {
  title: "Forecast",
};

export const instant = false;

export default async function Page() {
  const member = await requireMember();
  if (!member) redirect("/login");
  const saved = await listMemberScenarios(member.id);
  return <ForecastView saved={saved} />;
}
