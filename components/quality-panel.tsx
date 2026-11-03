import type { FreedomQuality } from "@/lib/quality";

export function QualityChips({ chips }: { chips: string[] }) {
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li
          key={chip}
          className="rounded-full border border-line bg-surface-raised px-2.5 py-1 text-xs leading-5 text-ink"
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}

export function QualityPanel({ quality }: { quality: FreedomQuality }) {
  const confidence = Math.round(quality.confidence * 100);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-4xl font-semibold tracking-tight text-ink">
          {quality.score == null ? "—" : quality.score}
          <span className="ml-1 text-lg font-medium text-muted">/ 100</span>
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          {quality.score == null
            ? "Not enough plan detail to score quality yet."
            : `${confidence}% of the quality model had enough plan data. Held-out factors are limited data. They are not scored as zero.`}
        </p>
      </div>
      <QualityChips chips={quality.chips} />
      <ol className="divide-y divide-line">
        {quality.factors.map((factor) => (
          <li key={factor.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{factor.label}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{factor.reason}</p>
            </div>
            <p className="shrink-0 text-sm text-gold-muted">
              {factor.limited || factor.earned == null
                ? `Held out of ${factor.weight}`
                : `${formatPoints(factor.earned)} / ${factor.weight}`}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
