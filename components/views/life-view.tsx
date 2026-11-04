"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { saveLifeAction } from "@/lib/community-actions";
import type { LifeView as LifeFields } from "@/lib/life";
import { formatChicagoDateTime } from "@/lib/week";

export function LifeView({ data }: { data: LifeFields }) {
  const router = useRouter();
  const [hours, setHours] = useState(data.timeFreedomHours == null ? "" : String(data.timeFreedomHours));
  const [family, setFamily] = useState(data.familyPriority == null ? "" : String(data.familyPriority));
  const [health, setHealth] = useState(data.healthStreakDays == null ? "" : String(data.healthStreakDays));
  const [experiences, setExperiences] = useState(data.experiencesPlanned);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    setMessage("");
    const result = await saveLifeAction({
      timeFreedomHours: hours,
      familyPriority: family,
      healthStreakDays: health,
      experiencesPlanned: experiences,
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Life"
        title="What the money is for"
        lede="Freedom Score measures the plan. This page is optional and self-reported: time, family, a health habit, and experiences you want. None of it changes the score. Money is the tool. The life is the point."
      />

      <form onSubmit={onSubmit} className="wc-card space-y-5 p-5 sm:p-6">
        <label className="block text-sm" htmlFor="time-freedom">
          Time freedom, hours per week
          <input
            id="time-freedom"
            className="wc-input mt-1.5"
            inputMode="decimal"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            placeholder="Hours you can spend as you choose"
          />
        </label>
        <label className="block text-sm" htmlFor="family-priority">
          Family priority, 1 to 5
          <input
            id="family-priority"
            className="wc-input mt-1.5"
            inputMode="numeric"
            value={family}
            onChange={(event) => setFamily(event.target.value)}
            placeholder="1 is barely attended, 5 is protected"
          />
        </label>
        <label className="block text-sm" htmlFor="health-streak">
          Health habit streak, days
          <input
            id="health-streak"
            className="wc-input mt-1.5"
            inputMode="numeric"
            value={health}
            onChange={(event) => setHealth(event.target.value)}
            placeholder="Days in a row"
          />
        </label>
        <label className="block text-sm" htmlFor="experiences">
          Travel and experiences planned
          <textarea
            id="experiences"
            className="wc-input mt-1.5 min-h-28"
            maxLength={280}
            value={experiences}
            onChange={(event) => setExperiences(event.target.value)}
            placeholder="A trip, a season, or an experience you want on the calendar"
          />
        </label>
        <button type="submit" className="wc-btn wc-btn-primary" disabled={pending}>
          {pending ? "Saving" : "Save life measures"}
        </button>
        {message ? (
          <p className="text-sm text-danger" role="alert">
            {message}
          </p>
        ) : null}
        {saved ? <p className="text-sm text-gold">Saved.</p> : null}
        {data.updatedAt ? (
          <p className="text-xs text-muted">Last updated {formatChicagoDateTime(data.updatedAt)}</p>
        ) : (
          <p className="text-xs text-muted">Nothing saved yet. Leave a field blank if you do not want to track it.</p>
        )}
      </form>
    </div>
  );
}
