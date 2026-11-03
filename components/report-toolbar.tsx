"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refreshMonthlyReportAction } from "@/lib/report-actions";

export function ReportToolbar({
  sharePath,
  isCurrent,
  audience,
}: {
  sharePath: string;
  isCurrent: boolean;
  audience: "member" | "guide";
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage(
        audience === "guide"
          ? "Copied. The member can open it while signed in, and so can you. It is not a public page."
          : "Copied. Only you, or your Wealth Guide, can open it while signed in. It is not a public page.",
      );
    } catch {
      setCopied(false);
      setMessage("The link could not be copied. You can copy it from the address bar.");
    }
  }

  async function refresh() {
    setPending(true);
    setMessage("");
    const result = await refreshMonthlyReportAction();
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="wc-btn wc-btn-primary" onClick={() => window.print()}>
          Print or save PDF
        </button>
        <button type="button" className="wc-btn wc-btn-ghost" onClick={() => void copyLink()}>
          {copied ? "Link copied" : "Copy private link"}
        </button>
        {isCurrent && audience === "member" ? (
          <button type="button" className="wc-btn wc-btn-ghost" onClick={() => void refresh()} disabled={pending}>
            {pending ? "Refreshing" : "Refresh this month"}
          </button>
        ) : null}
      </div>
      {message ? <p className="max-w-2xl text-xs leading-5 text-muted">{message}</p> : null}
    </div>
  );
}
