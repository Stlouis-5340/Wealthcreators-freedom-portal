export function ProgressMeter({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised" aria-hidden="true">
      <div className="h-full bg-gold" style={{ width: `${width}%` }} />
    </div>
  );
}
