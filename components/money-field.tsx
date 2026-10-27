export function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint ? <span className="mt-1 block text-xs leading-5 text-muted">{hint}</span> : null}
      <span className="mt-2 flex items-center rounded-xl border border-line bg-background px-3 focus-within:border-gold">
        <span className="text-sm text-muted" aria-hidden>
          $
        </span>
        <input
          id={id}
          className="w-full bg-transparent py-2 pl-2 text-right text-sm text-ink outline-none"
          inputMode="decimal"
          type="number"
          min={0}
          step={1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => {
            const next = event.target.value === "" ? 0 : Number(event.target.value);
            onChange(Number.isFinite(next) ? next : 0);
          }}
        />
      </span>
    </label>
  );
}
