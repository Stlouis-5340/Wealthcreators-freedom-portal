import type { Metadata } from "next";
import { MilestonesView } from "@/components/views/milestones-view";

export const metadata: Metadata = {
  title: "Milestones",
};

export default function Page() {
  return <MilestonesView />;
}
