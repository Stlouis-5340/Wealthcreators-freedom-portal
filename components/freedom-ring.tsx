import { formatPercentOrDash } from "@/lib/format";

export function FreedomRing({ score }: { score: number | null }) {
  const size = 188;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = score == null ? 0 : Math.min(Math.max(score, 0), 100);
  const offset = circumference - (shown / 100) * circumference;
  const surplus = score != null && score >= 100;
  const label =
    score == null
      ? "Freedom Score unavailable"
      : `Freedom Score ${score.toFixed(1)} percent`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={label}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={surplus ? "#F0C050" : "#E8B84A"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tracking-tight text-ink">
          {formatPercentOrDash(score, 1)}
        </span>
        <span className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gold-muted">
          Freedom
        </span>
      </div>
    </div>
  );
}
