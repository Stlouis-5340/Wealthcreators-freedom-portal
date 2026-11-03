import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth, isPortalRole } from "@/auth";
import { homeForRole } from "@/lib/demo-accounts";

export const instant = false;

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <MemberGate>{children}</MemberGate>
    </Suspense>
  );
}

async function MemberGate({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "member") redirect(isPortalRole(role) ? homeForRole(role) : "/login");
  return children;
}
