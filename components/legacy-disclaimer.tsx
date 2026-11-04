import { LEGACY_DISCLAIMER } from "@/lib/legacy";

export function LegacyDisclaimer() {
  return (
    <aside className="rounded-2xl border border-gold/50 bg-surface px-5 py-4" aria-label="Not legal advice">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">
        Educational organizer · Not legal advice
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{LEGACY_DISCLAIMER}</p>
    </aside>
  );
}
