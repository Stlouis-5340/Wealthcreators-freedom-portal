import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth, isPortalRole } from "@/auth";
import { homeForRole } from "@/lib/demo-accounts";
import { STAFF_MFA_ENROLL_PATH, staffNeedsEnrollment } from "@/lib/staff-mfa";

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
  if (staffNeedsEnrollment(role, session?.user?.mfaEnabled === true)) redirect(STAFF_MFA_ENROLL_PATH);
  if (role !== "admin") redirect(isPortalRole(role) ? homeForRole(role) : "/login");
  return children;
}
