import type { StatusLabel } from "@/lib/roster";

const styles: Record<StatusLabel["key"], string> = {
  freedom: "border-success/40 bg-success/10 text-success",
  near: "border-gold-muted/40 bg-surface-raised text-ink",
  attention: "border-danger/40 bg-danger/10 text-danger",
  behind: "border-warning/40 bg-warning/10 text-warning",
  track: "border-line text-muted",
};

export function StatusPill({ status }: { status: StatusLabel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${styles[status.key]}`}
    >
      {status.label}
    </span>
  );
}

export function StatusPills({ statuses }: { statuses: StatusLabel[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {statuses.map((status) => (
        <StatusPill key={status.key} status={status} />
      ))}
    </div>
  );
}
