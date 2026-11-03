import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { chicagoMonthKey } from "@/lib/month";
import { reportPath } from "@/lib/report-store";

export const metadata = {
  title: "Freedom Report",
};

export const instant = false;

export default async function Page() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  redirect(reportPath(id, chicagoMonthKey()));
}
