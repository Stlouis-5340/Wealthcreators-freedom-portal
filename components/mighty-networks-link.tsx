import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";

export function CommunityAnchor({
  url,
  className,
  onClick,
  children,
}: {
  url: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function hostLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/** Member Community page. Configured addresses leave the portal. A blank address does not invent a login. */
export function MemberCommunity({ url }: { url: string | null }) {
  if (!url) {
    return (
      <PageHeader
        eyebrow="Community"
        title="Community coming soon"
        lede="The Wealth Creators community on Mighty Networks is not linked yet. When an address is configured, Community opens it in a new tab. This page has no sign-in form."
      />
    );
  }

  const host = hostLabel(url);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Community"
        title="Mighty Networks"
        lede="Wealth Creators discussion stays on Mighty Networks. Open it in a new tab. This portal does not sign you in, and it does not host the conversation."
      />
      <section className="wc-card p-5 sm:p-6">
        <CommunityAnchor url={url} className="wc-btn wc-btn-primary">
          Open Mighty Networks
        </CommunityAnchor>
        {host ? <p className="mt-4 text-sm leading-6 text-muted">Opens {host}</p> : null}
      </section>
    </div>
  );
}

/** One line on the guide command center. Hidden when the address is unset. */
export function GuideMightyNetworksLink({ url }: { url: string | null }) {
  if (!url) return null;

  return (
    <p className="wc-card px-5 py-4 text-sm leading-6">
      <span className="font-medium text-ink">Community. </span>
      <CommunityAnchor url={url} className="font-medium text-gold hover:text-gold-bright">
        Open Mighty Networks
      </CommunityAnchor>
      <span className="text-muted"> for member discussion. The portal does not sign anyone in.</span>
    </p>
  );
}
