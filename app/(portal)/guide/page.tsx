import type { Metadata } from "next";
import { CommandCenterView } from "@/components/views/command-center-view";
import { RosterView } from "@/components/views/roster-view";

export const metadata: Metadata = {
  title: "Command center",
};

export default function Page() {
  return (
    <div className="space-y-12">
      <CommandCenterView />
      <RosterView />
    </div>
  );
}
