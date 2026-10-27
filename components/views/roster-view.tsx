"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { usePortal } from "@/components/portal-provider";
import { StatusPills } from "@/components/status-pill";
import { formatMoney, formatPercentOrDash, relativeDay } from "@/lib/format";
import {
  matchesFilter,
  rosterFilters,
  type RosterFilter,
  type RosterRow,
} from "@/lib/roster";
import { GUIDE } from "@/lib/sample-data";

type SortKey = "attention" | "score-asc" | "score-desc" | "name";

export function RosterView() {
  const { roster } = usePortal();
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [sort, setSort] = useState<SortKey>("attention");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    return Object.fromEntries(
      rosterFilters.map((item) => [
        item.id,
        roster.filter((row) => matchesFilter(row, item.id)).length,
      ]),
    ) as Record<RosterFilter, number>;
  }, [roster]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return roster
      .filter((row) => matchesFilter(row, filter))
      .filter((row) => (needle ? row.name.toLowerCase().includes(needle) : true))
      .sort((a, b) => compareRows(a, b, sort));
  }, [roster, filter, query, sort]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${GUIDE.name} · Wealth Guide`}
        title="Member roster"
        lede="Freedom Score, the six-year Freedom goal, this-year steps, and net worth. No bank credentials and no transactions."
      />

      <div className="flex flex-wrap gap-2">
        {rosterFilters.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(item.id)}
              className={`rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                active
                  ? "border-gold bg-gold text-background"
                  : "border-line text-muted hover:border-gold-muted hover:text-ink"
              }`}
            >
              {item.label}
              <span className={active ? "text-background/70" : "text-muted"}> · {counts[item.id]}</span>
            </button>
          );
        })}
      </div>

      <p className="max-w-3xl text-sm leading-6 text-muted">
        Needs attention: score under 45%, no steps done, or quiet for more than 30 days. Goals
        behind: the six-year Freedom goal is under 25% along, or this year is under 40% done while
        the score is still below the line. Near the line is 85% up to 100%. Freedom+ is 100% or more.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="block flex-1">
          <span className="sr-only">Search members</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members"
            className="wc-input"
          />
        </label>
        <label className="block sm:w-64">
          <span className="sr-only">Sort roster</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="wc-input"
          >
            <option value="attention">Needs a look first</option>
            <option value="score-asc">Freedom Score, low to high</option>
            <option value="score-desc">Freedom Score, high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <p className="text-sm text-muted">
        Showing {rows.length} of {roster.length}
      </p>

      {rows.length === 0 ? (
        <p className="wc-card px-5 py-8 text-sm text-muted">No members match this view.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/guide/${row.id}`}
                className="wc-card block p-4 transition-colors hover:border-gold-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-medium text-ink">{row.name}</p>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{row.coachingNote}</p>
                  </div>
                  <StatusPills statuses={row.statuses} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Metric label="Freedom Score" value={formatPercentOrDash(row.metrics.freedomScore, 1)} />
                  <Metric label="Yield on assets" value={formatPercentOrDash(row.metrics.yieldOnAssets, 2)} />
                  <Metric label="6-year goal" value={`${Math.round(row.sixYearProgress)}%`} />
                  <Metric label="This year" value={`${row.stepsDone}/${row.stepsTotal}`} />
                  <Metric label="Net worth" value={formatMoney(row.metrics.netWorth)} />
                  <Metric label="Last active" value={relativeDay(row.lastActive)} />
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
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

function attentionRank(row: RosterRow): number {
  if (row.flags.needsAttention) return 0;
  if (row.flags.goalsBehind) return 1;
  if (row.flags.nearLine) return 2;
  if (row.flags.freedomPlus) return 4;
  return 3;
}

function compareRows(a: RosterRow, b: RosterRow, sort: SortKey): number {
  if (sort === "name") return a.name.localeCompare(b.name);
  if (sort === "score-desc") {
    return (b.metrics.freedomScore ?? -1) - (a.metrics.freedomScore ?? -1);
  }
  if (sort === "score-asc") {
    return (a.metrics.freedomScore ?? -1) - (b.metrics.freedomScore ?? -1);
  }
  const rank = attentionRank(a) - attentionRank(b);
  if (rank !== 0) return rank;
  return (a.metrics.freedomScore ?? -1) - (b.metrics.freedomScore ?? -1);
}
