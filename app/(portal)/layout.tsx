import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth, isPortalRole } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { PortalProvider } from "@/components/portal-provider";

export const instant = false;

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PortalFallback />}>
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}

async function AuthedShell({ children }: { children: ReactNode }) {
  const session = await auth();
  const user = session?.user;
  if (!user || !isPortalRole(user.role)) redirect("/login");

  return (
    <PortalProvider
      viewer={{
        id: user.id,
        name: user.name ?? "Member",
        email: user.email ?? "",
        role: user.role,
      }}
    >
      <AppShell
        user={{
          name: user.name ?? "Member",
          email: user.email ?? "",
          role: user.role,
        }}
      >
        {children}
      </AppShell>
    </PortalProvider>
  );
}

function PortalFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="wc-eyebrow">Freedom Portal</p>
    </div>
  );
}
