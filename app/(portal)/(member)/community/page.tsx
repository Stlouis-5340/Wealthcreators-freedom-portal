import type { Metadata } from "next";
import { MemberCommunity } from "@/components/mighty-networks-link";
import { readCommunityUrl } from "@/lib/community-link";

export const metadata: Metadata = {
  title: "Community",
};

export const instant = false;

export default async function Page() {
  const url = await readCommunityUrl();
  return <MemberCommunity url={url} />;
}
