import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth, isPortalRole } from "@/auth";
import { homeForRole } from "@/lib/demo-accounts";

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
  const role = session?.user?.role;
  if (role !== "guide") redirect(isPortalRole(role) ? homeForRole(role) : "/login");
  return children;
}
