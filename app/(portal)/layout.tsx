import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth, isPortalRole } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { PortalProvider } from "@/components/portal-provider";
import { readCommunityUrl } from "@/lib/community-link";
import { unreadHubCount } from "@/lib/hub-store";
import { loadPortalSnapshot } from "@/lib/plan-store";

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
  if (!user?.id || !isPortalRole(user.role)) redirect("/login");
  const snapshot = await loadPortalSnapshot({ id: user.id, role: user.role });
  if (!snapshot) redirect("/login");
  const guideUnread = user.role === "member" ? await unreadHubCount(user.id, user.id) : 0;
  const communityUrl = await readCommunityUrl();

  return (
    <PortalProvider snapshot={snapshot}>
      <AppShell
        communityUrl={communityUrl}
        guideUnread={guideUnread}
        user={{
          name: snapshot.viewer.name,
          email: snapshot.viewer.email,
          role: snapshot.viewer.role,
          mfaEnabled: snapshot.viewer.mfaEnabled,
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
