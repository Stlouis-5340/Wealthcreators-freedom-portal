import type { Metadata } from "next";
import { EfficiencyView } from "@/components/views/efficiency-view";

export const metadata: Metadata = {
  title: "Wealth Efficiency",
};

export default function Page() {
  return <EfficiencyView />;
}
