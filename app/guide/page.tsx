import type { Metadata } from "next";
import { GuideAccess } from "@/components/guide-access";
import { RosterView } from "@/components/views/roster-view";

export const metadata: Metadata = {
  title: "Roster",
};

export default function Page() {
  return (
    <GuideAccess>
      <RosterView />
    </GuideAccess>
  );
}
