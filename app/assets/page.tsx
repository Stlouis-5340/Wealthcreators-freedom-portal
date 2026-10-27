import type { Metadata } from "next";
import { AssetsView } from "@/components/views/assets-view";

export const metadata: Metadata = {
  title: "Net Worth",
};

export default function Page() {
  return <AssetsView />;
}
