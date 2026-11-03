import { CollaborationHub } from "@/components/collaboration-hub";
import { loadHubForGuide, markHubRead } from "@/lib/hub-store";
import { requireGuide } from "@/lib/permissions";

export async function GuideWorkspace({ memberId }: { memberId: string }) {
  const guide = await requireGuide();
  if (!guide) return null;
  const model = await loadHubForGuide(guide.id, memberId);
  if (!model) return null;
  await markHubRead(guide.id, memberId);
  return <CollaborationHub model={model} heading={false} />;
}
