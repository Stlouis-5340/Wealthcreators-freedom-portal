import type { Metadata } from "next";
import { SpendingView } from "@/components/views/spending-view";

export const metadata: Metadata = {
  title: "Spending Plan",
};

export default function Page() {
  return <SpendingView />;
}
