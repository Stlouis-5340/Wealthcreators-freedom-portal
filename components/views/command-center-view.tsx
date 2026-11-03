"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { usePortal } from "@/components/portal-provider";
import { attentionQueues, type AttentionItem, type AttentionQueues } from "@/lib/command-center";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import { GUIDE } from "@/lib/sample-data";
import { chicagoWeekKey, formatWeekSpan } from "@/lib/week";

const sections: {
  id: keyof AttentionQueues;
  title: string;
  lede: string;
}[] = [
  {
    id: "support",
    title: "Requested support",
    lede: "The latest check-in asked for a Wealth Guide. An older request stays here until a newer check-in says no.",
  },
  {
    id: "missed",
    title: "Missed check-in",
    lede: "No check-in is saved for the current week. Weeks start Monday, America/Chicago.",
  },
  {
    id: "declining",
    title: "Declining Freedom Score",
    lede: "The live Freedom Score is at least 2 points below the score saved on an earlier check-in. There is no daily score history, so a member with only one snapshot is not listed.",
  },
  {
    id: "behind",
    title: "Behind on goals",
    lede: "A past checkpoint was missed, this year's steps are still mostly open, or a Guide task is past its due date. Goal steps themselves have no due dates.",
  },
  {
    id: "progress",
    title: "Recent progress",
    lede: "Steps for the year are done, Freedom Score is at or above the line, this year's Freedom checkpoint is met, or this week's priority action was completed with most steps already done.",
  },
];

export function CommandCenterView() {
  const { roster } = usePortal();
  const weekKey = chicagoWeekKey();
  const queues = attentionQueues(roster);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${GUIDE.name} · Wealth Guide`}
        title="Command center"
        lede="Who needs a conversation this week, and why. Each flag comes from a check-in, a saved Freedom Score, open steps, or a task you assigned. These lists do not use age, family, or other personal characteristics. Bank names, account numbers, and connections stay off this screen."
      />
      <p className="text-sm text-muted">
        This week is {formatWeekSpan(weekKey)}, America/Chicago.
      </p>
      {sections.map((section) => (
        <Queue
          key={section.id}
          title={section.title}
          lede={section.lede}
          items={queues[section.id]}
          roster={roster}
        />
      ))}
    </div>
  );
}

function Queue({
  title,
  lede,
  items,
  roster,
}: {
  title: string;
  lede: string;
  items: AttentionItem[];
  roster: ReturnType<typeof usePortal>["roster"];
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-gold-muted">{items.length}</p>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-muted">{lede}</p>
      {items.length === 0 ? (
        <p className="wc-card px-5 py-6 text-sm text-muted">No one is in this queue right now.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const member = roster.find((row) => row.id === item.memberId);
            if (!member) return null;
            return (
              <li key={item.memberId}>
                <Link
                  href={`/guide/${member.id}`}
                  className="wc-card block p-4 transition-colors hover:border-gold-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-lg font-medium text-ink">{member.name}</p>
                    <span className="text-sm text-gold-muted">Open</span>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink">{item.reason}</p>
                  <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Metric label="Freedom Score" value={formatPercentOrDash(member.metrics.freedomScore, 1)} />
                    <Metric label="Freedom Gap" value={formatMoney(member.metrics.monthlyFreedomGap)} />
                    <Metric
                      label="Quality"
                      value={member.quality.score == null ? "—" : `${member.quality.score}/100`}
                    />
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
