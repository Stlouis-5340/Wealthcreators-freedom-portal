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
            ? "An authenticator app is required for Guide and Admin accounts. Password sign-in brings you here first. The rest of the portal stays closed until setup is finished. After that, every sign-in asks for a 6-digit code."
            : "An authenticator app is optional for members. Turn it on if you want a second step after your password."
        }
      />
      <MfaPanel enabled={actor.mfaEnabled} prompted={prompted} />
    </div>
  );
}
