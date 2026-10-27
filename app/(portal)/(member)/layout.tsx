import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { auth } from "@/auth";

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
  if (session?.user?.role !== "member") redirect("/guide");
  return children;
}
