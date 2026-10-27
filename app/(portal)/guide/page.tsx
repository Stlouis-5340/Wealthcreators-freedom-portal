import type { Metadata } from "next";
import { RosterView } from "@/components/views/roster-view";

export const metadata: Metadata = {
  title: "Roster",
};

export default function Page() {
  return <RosterView />;
}
