import type { Metadata } from "next";
import { InvitePanel } from "@/components/invites/invite-panel";
import { GuideMightyNetworksLink } from "@/components/mighty-networks-link";
import { CommandCenterView } from "@/components/views/command-center-view";
import { RosterView } from "@/components/views/roster-view";
import { readCommunityUrl } from "@/lib/community-link";

export const metadata: Metadata = {
  title: "Command center",
};

export default async function Page() {
  const communityUrl = await readCommunityUrl();

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <GuideMightyNetworksLink url={communityUrl} />
        <CommandCenterView />
      </div>
      <InvitePanel audience="guide" />
      <RosterView />
    </div>
  );
}
