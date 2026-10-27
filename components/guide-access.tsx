"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { usePortal } from "@/components/portal-provider";
import { GUIDE } from "@/lib/sample-data";

export function GuideAccess({ children }: { children: ReactNode }) {
  const { role, setRole } = usePortal();
  const router = useRouter();

  if (role === "guide") return children;

  return (
    <section className="wc-card max-w-xl p-6 sm:p-8">
      <p className="wc-eyebrow">Wealth Guide</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">The roster is for guides</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {GUIDE.name} monitors Freedom Score, six-year goals, and this-year steps for assigned
        members. The roster never includes bank logins or raw transactions. Switch the demo
        role to open it.
      </p>
      <button
        type="button"
        className="wc-btn wc-btn-primary mt-6"
        onClick={() => {
          setRole("guide");
          router.push("/guide");
        }}
      >
        View as {GUIDE.name}
      </button>
    </section>
  );
}
