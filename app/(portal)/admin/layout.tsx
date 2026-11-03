import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth, isPortalRole } from "@/auth";
import { homeForRole } from "@/lib/demo-accounts";

export const instant = false;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "admin") redirect(isPortalRole(role) ? homeForRole(role) : "/login");
  return children;
}
