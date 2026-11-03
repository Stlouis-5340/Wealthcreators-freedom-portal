import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { MfaPanel } from "@/components/security/mfa-panel";
import { requireActor } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Security",
};

export const instant = false;

export default async function Page() {
  const actor = await requireActor();
  if (!actor) redirect("/login");
  const prompted = actor.role === "guide" || actor.role === "admin";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Security"
        lede={
          prompted
            ? "Add an authenticator app for this Guide or Admin account. The demo password still signs you in until you enroll. After that, sign-in asks for a code."
            : "An authenticator app is optional for members. Turn it on if you want a second step after your password."
        }
      />
      <MfaPanel enabled={actor.mfaEnabled} prompted={prompted} />
    </div>
  );
}
