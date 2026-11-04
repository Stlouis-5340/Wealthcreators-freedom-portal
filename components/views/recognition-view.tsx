"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { setAchievementVisibilityAction } from "@/lib/community-actions";
import type { RecognitionPage } from "@/lib/community-store";
import { formatChicagoDateTime } from "@/lib/week";

export function RecognitionView({ data }: { data: RecognitionPage }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pendingKey, setPendingKey] = useState("");
  const [unlocked, setUnlocked] = useState(data.unlocked);
  const signature = JSON.stringify(data.unlocked);
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setUnlocked(data.unlocked);
  }

  async function choose(key: string, visibility: "private" | "guide") {
    setPendingKey(key);
    setMessage("");
    setUnlocked((current) => current.map((card) => (card.key === key ? { ...card, visibility } : card)));
    const result = await setAchievementVisibilityAction(key, visibility);
    setPendingKey("");
    if (!result.ok) {
      setUnlocked(data.unlocked);
      setMessage(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Recognition"
        title="Marks along the way"
        lede="These unlock from the plan, the Freedom Report, check-ins, and lessons you have already recorded. Private is the default. You can share a card with your Wealth Guide. There is no public feed, and a card never shows balances, income, debt, or account details."
      />

      {message ? (
        <p className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink" role="alert">
          {message}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Unlocked</h2>
        {unlocked.length === 0 ? (
          <p className="wc-card px-5 py-6 text-sm text-muted">Nothing unlocked yet. The list below is what the portal can recognize.</p>
        ) : (
          unlocked.map((card) => (
            <article key={card.key} className="wc-card border-gold/40 p-5 sm:p-6">
              <p className="wc-eyebrow">Unlocked</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">{card.title}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{card.detail}</p>
              <p className="mt-3 text-xs text-gold-muted">{formatChicagoDateTime(card.unlockedAt)}</p>
              <fieldset className="mt-4" disabled={pendingKey === card.key}>
                <legend className="text-sm font-medium text-ink">Who can see this</legend>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`visibility-${card.key}`}
                      checked={card.visibility === "private"}
                      onChange={() => void choose(card.key, "private")}
                    />
                    Private
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`visibility-${card.key}`}
                      checked={card.visibility === "guide"}
                      onChange={() => void choose(card.key, "guide")}
                    />
                    Shared with your Guide
                  </label>
                </div>
              </fieldset>
            </article>
          ))
        )}
      </section>

      {data.ahead.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Still ahead</h2>
          {data.ahead.map((card) => (
            <article key={card.key} className="wc-card p-5">
              <h3 className="text-lg font-medium text-ink">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{card.detail}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
