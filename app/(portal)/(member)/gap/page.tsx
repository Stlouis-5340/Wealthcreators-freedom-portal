import type { Metadata } from "next";
import { GapView } from "@/components/views/gap-view";

export const metadata: Metadata = {
  title: "Freedom Gap",
};

export default function Page() {
  return <GapView />;
}
