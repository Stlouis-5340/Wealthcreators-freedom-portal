import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AUDIT_ACTIONS, AUDIT_LABELS, isAuditAction } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { formatChicagoDateTime } from "@/lib/week";

export const metadata: Metadata = {
  title: "Audit log",
};

export const instant = false;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");
  const { action } = await searchParams;
  const selected = action && isAuditAction(action) ? action : "";
  const rows = await prisma.auditLog.findMany({
    where: selected ? { action: selected } : undefined,
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { actor: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Audit log"
        lede="Recent role changes, Guide assignments, member invites, visibility changes, pauses, authenticator setup, authenticator sign-in checks, Guide opens of a member summary or Freedom Report, and shared forecast scenarios. Tokens, secrets, and sign-in codes are not stored here."
      />
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm text-ink">
          Action
          <select name="action" defaultValue={selected} className="wc-input mt-1.5 sm:w-80">
            <option value="">All recent actions</option>
            {AUDIT_ACTIONS.map((item) => (
              <option key={item} value={item}>
                {AUDIT_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="wc-btn wc-btn-primary">
          Filter
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="wc-card px-5 py-6 text-sm text-muted">No audit entries yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="wc-card p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  {isAuditAction(row.action) ? AUDIT_LABELS[row.action] : row.action}
                </p>
                <p className="text-xs text-muted">{formatChicagoDateTime(row.createdAt.toISOString())}</p>
              </div>
              <p className="mt-2 text-sm text-muted">
                {row.actor.name} · {row.actor.email}
              </p>
              <p className="mt-1 text-xs text-muted">
                {row.targetType} {row.targetId}
                {row.ip ? ` · ${row.ip}` : ""}
              </p>
              {row.meta && row.meta !== "{}" ? (
                <p className="mt-2 break-words font-mono text-xs leading-5 text-ink">{row.meta}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted">
        <Link href="/admin" className="text-gold-muted hover:text-gold">
          Back to People
        </Link>
      </p>
    </div>
  );
}
