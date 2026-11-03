import {
  integrityDetail,
  integrityLabel,
  type DataIntegrity,
} from "@/lib/integrity";

const styles: Record<DataIntegrity, string> = {
  verified: "border-success/40 bg-success/10 text-success",
  estimated: "border-gold/40 bg-gold/10 text-gold",
  stale: "border-warning/50 bg-warning/10 text-warning",
  missing: "border-line bg-surface-raised text-muted",
};

export function IntegrityBadge({ status }: { status: DataIntegrity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${styles[status]}`}
      title={integrityDetail(status)}
    >
      {integrityLabel(status)}
    </span>
  );
}

export function IntegrityLegend() {
  const statuses: DataIntegrity[] = ["verified", "estimated", "stale", "missing"];
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <ul className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <li key={status}>
            <IntegrityBadge status={status} />
          </li>
        ))}
      </ul>
      <p className="text-xs leading-5 text-muted">
        Stale means the last refresh or confirmation is older than 14 days.
      </p>
    </div>
  );
}
