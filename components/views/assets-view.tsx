"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MoneyField } from "@/components/money-field";
import { PageHeader } from "@/components/page-header";
import { usePortal } from "@/components/portal-provider";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import { passiveRules } from "@/lib/rules";

export function AssetsView() {
  const {
    assets,
    liabilities,
    streams,
    metrics,
    updateAsset,
    updateLiability,
    updateStream,
  } = usePortal();
  const [plaidOpen, setPlaidOpen] = useState(false);
  const closePlaid = useCallback(() => setPlaidOpen(false), []);
  const equity =
    metrics.totalAssets > 0 ? Math.max(metrics.netWorth, 0) / metrics.totalAssets : 0;
  const financed =
    metrics.totalAssets > 0
      ? Math.min(metrics.totalLiabilities, metrics.totalAssets) / metrics.totalAssets
      : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Net worth and assets"
        title="What you own, what you owe, what it yields"
        lede="Balances are saved on your plan. Yield on assets uses annual passive income divided by total assets. Plaid Link is not connected in this build."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="wc-card p-5 lg:col-span-2">
          <p className="wc-eyebrow">Net worth</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">{formatMoney(metrics.netWorth)}</p>
          <p className="mt-2 text-sm text-muted">
            {formatMoney(metrics.totalAssets)} assets − {formatMoney(metrics.totalLiabilities)} liabilities
          </p>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-raised">
            <div className="bg-gold" style={{ width: `${equity * 100}%` }} />
            <div className="bg-[#3a3a3a]" style={{ width: `${financed * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            Gold is the unfinanced share of assets. The gray share is still paired with a liability.
          </p>
        </article>
        <article className="wc-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="wc-eyebrow">Yield on assets</p>
            <span className="text-[10px] uppercase tracking-[0.14em] text-gold">Primary</span>
          </div>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            {formatPercentOrDash(metrics.yieldOnAssets, 2)}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {formatMoney(metrics.annualPassive)} a year ÷ {formatMoney(metrics.totalAssets)} of assets.
          </p>
        </article>
      </section>

      <section className="wc-card border-dashed p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div>
          <p className="wc-eyebrow">Accounts</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Connect with Plaid</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Nothing on this page is linked to a bank. The button explains the stub. When Plaid is
            configured, Link will import balances you confirm. Guides still will not see credentials
            or transactions.
          </p>
        </div>
        <button type="button" className="wc-btn wc-btn-primary mt-4 shrink-0 sm:mt-0" onClick={() => setPlaidOpen(true)}>
          Connect with Plaid
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Assets</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((asset) => (
            <div key={asset.id} className="wc-card p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">
                  {asset.group} · {asset.institution}
                </p>
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted">
                  Sample
                </span>
              </div>
              <MoneyField
                id={`asset-${asset.id}`}
                label={asset.name}
                value={asset.balance}
                onChange={(balance) => updateAsset(asset.id, balance)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Liabilities</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {liabilities.map((item) => (
            <div key={item.id} className="wc-card p-5">
              <MoneyField
                id={`liability-${item.id}`}
                label={item.name}
                hint={item.note}
                value={item.balance}
                onChange={(balance) => updateLiability(item.id, balance)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">
            Passive streams
          </h2>
          <p className="text-sm text-muted">{formatMoney(metrics.monthlyPassive)} / month</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {streams.map((stream) => (
            <div key={stream.id} className="wc-card p-5">
              <MoneyField
                id={`stream-${stream.id}`}
                label={stream.name}
                hint={stream.source}
                value={stream.monthly}
                onChange={(monthly) => updateStream(stream.id, monthly)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <RuleList title="Counts" items={passiveRules.counts} />
        <RuleList title="Does not count" items={passiveRules.excluded} />
        <RuleList title="Configurable later" items={passiveRules.later} />
      </section>

      {plaidOpen ? <PlaidDialog onClose={closePlaid} /> : null}
    </div>
  );
}

function RuleList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="wc-card p-5">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function PlaidDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/75" aria-label="Close dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <p className="wc-eyebrow">Plaid Link</p>
        <h2 id={titleId} className="mt-2 text-2xl font-semibold tracking-tight">
          Plaid is not connected
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          This build has no Plaid keys and no Link token. The button does not contact a bank and
          does not collect a password. When it is wired, Link will let a member choose an
          institution and confirm which balances feed assets and passive tags.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Wealth Guides will still see totals, Freedom Score, and goal progress only. Not
          credentials. Not raw transactions.
        </p>
        <div className="mt-6 flex justify-end">
          <button ref={closeRef} type="button" className="wc-btn wc-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
