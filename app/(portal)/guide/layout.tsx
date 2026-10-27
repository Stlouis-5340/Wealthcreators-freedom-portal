import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth } from "@/auth";

export const instant = false;

export default function GuideLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GuideGate>{children}</GuideGate>
    </Suspense>
  );
}

async function GuideGate({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "guide") redirect("/");
  return children;
}
