"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoneyField } from "@/components/money-field";
import { PageHeader } from "@/components/page-header";
import { PlaidLinkOpen } from "@/components/plaid-link-open";
import { usePortal } from "@/components/portal-provider";
import { formatMoney, formatPercentOrDash } from "@/lib/format";
import {
  createLinkTokenAction,
  disconnectPlaidItemAction,
  exchangePublicTokenAction,
  refreshPlaidBalancesAction,
} from "@/lib/plaid-actions";
import { humanType, isSyncedLine, maskDisplay } from "@/lib/plaid-labels";
import type { ConnectedItem } from "@/lib/plans";
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
    plaidConfigured,
    connectedItems,
  } = usePortal();
  const [dialog, setDialog] = useState<"unconfigured" | { message: string } | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [pending, setPending] = useState<"link" | "exchange" | "refresh" | "remove" | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const handedOff = useRef(false);
  const router = useRouter();
  const equity =
    metrics.totalAssets > 0 ? Math.max(metrics.netWorth, 0) / metrics.totalAssets : 0;
  const financed =
    metrics.totalAssets > 0
      ? Math.min(metrics.totalLiabilities, metrics.totalAssets) / metrics.totalAssets
      : 0;

  const closeDialog = useCallback(() => setDialog(null), []);

  const finishExchange = useCallback(async (publicToken: string) => {
    if (handedOff.current) return;
    handedOff.current = true;
    setLinkToken(null);
    setPending("exchange");
    const result = await exchangePublicTokenAction(publicToken);
    if (!result.ok) {
      setPending(null);
      setDialog({ message: result.error });
      return;
    }
    setPending(null);
    router.refresh();
  }, [router]);

  const leaveLink = useCallback((message: string | null) => {
    if (handedOff.current) return;
    setLinkToken(null);
    if (message) setDialog({ message });
  }, []);

  async function connect() {
    setDialog(null);
    if (!plaidConfigured) {
      setDialog("unconfigured");
      return;
    }
    setPending("link");
    const result = await createLinkTokenAction();
    setPending(null);
    if (!result.configured) {
      setDialog("unconfigured");
      return;
    }
    if ("error" in result) {
      setDialog({ message: result.error });
      return;
    }
    handedOff.current = false;
    setLinkToken(result.linkToken);
  }

  async function refresh() {
    setPending("refresh");
    const result = await refreshPlaidBalancesAction();
    if (!result.ok) {
      setPending(null);
      setDialog({ message: result.error });
      return;
    }
    setPending(null);
    router.refresh();
  }

  async function remove(itemId: string) {
    setPending("remove");
    const result = await disconnectPlaidItemAction(itemId);
    if (!result.ok) {
      setPending(null);
      setDialog({ message: result.error });
      return;
    }
    setRemoveId(null);
    setPending(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Net worth and assets"
        title="What you own, what you owe, what it yields"
        lede="Balances are saved on your plan. Yield on assets uses annual passive income divided by total assets. Connect a bank or brokerage with Plaid to add those balances. Guides see totals only."
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

      <section className="wc-card border-dashed p-5 sm:p-6">
        <div className="sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="wc-eyebrow">Accounts</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Connect with Plaid</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              {plaidConfigured
                ? "Link opens in Plaid sandbox. Checking and savings land in cash. Brokerage balances land in investments. Credit cards and loans land in liabilities, so they do not inflate yield on assets. Guides still see totals only."
                : "Plaid credentials are not set on this server. The button explains that, and it does not contact a bank. Sample balances below stay editable. Guides see totals only."}
            </p>
          </div>
          <div className="mt-4 flex shrink-0 flex-col gap-2 sm:mt-0">
            <button
              type="button"
              className="wc-btn wc-btn-primary"
              onClick={() => void connect()}
              disabled={pending !== null}
            >
              {pending === "link" ? "Opening Plaid…" : pending === "exchange" ? "Saving connection…" : "Connect with Plaid"}
            </button>
            {plaidConfigured && connectedItems.length > 0 ? (
              <button
                type="button"
                className="wc-btn wc-btn-ghost"
                onClick={() => void refresh()}
                disabled={pending !== null}
              >
                {pending === "refresh" ? "Refreshing…" : "Refresh balances"}
              </button>
            ) : null}
          </div>
        </div>
        {connectedItems.length > 0 ? (
          <div className="mt-6 space-y-4">
            {connectedItems.map((item) => (
              <ConnectedGroup
                key={item.id}
                item={item}
                confirming={removeId === item.id}
                busy={pending === "remove"}
                onAskRemove={() => setRemoveId(item.id)}
                onCancel={() => setRemoveId(null)}
                onRemove={() => void remove(item.id)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Assets</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((asset) =>
            isSyncedLine(asset.id) ? (
              <div key={asset.id} className="wc-card p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">
                    {asset.group}
                    {asset.institution ? ` · ${asset.institution}` : ""}
                  </p>
                  <span className="rounded-full border border-gold-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-gold">
                    Synced
                  </span>
                </div>
                <p className="text-sm text-muted">{asset.name}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{formatMoney(asset.balance, true)}</p>
              </div>
            ) : (
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
            ),
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-gold-muted">Liabilities</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {liabilities.map((item) =>
            isSyncedLine(item.id) ? (
              <div key={item.id} className="wc-card p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">{item.note}</p>
                  <span className="rounded-full border border-gold-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-gold">
                    Synced
                  </span>
                </div>
                <p className="text-sm text-muted">{item.name}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{formatMoney(item.balance, true)}</p>
              </div>
            ) : (
              <div key={item.id} className="wc-card p-5">
                <MoneyField
                  id={`liability-${item.id}`}
                  label={item.name}
                  hint={item.note}
                  value={item.balance}
                  onChange={(balance) => updateLiability(item.id, balance)}
                />
              </div>
            ),
          )}
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

      {linkToken ? (
        <PlaidLinkOpen key={linkToken} token={linkToken} onPublicToken={(token) => void finishExchange(token)} onExit={leaveLink} />
      ) : null}
      {dialog ? (
        <PlaidDialog
          title={dialog === "unconfigured" ? "Plaid is not configured" : "Plaid could not connect"}
          onClose={closeDialog}
        >
          {dialog === "unconfigured" ? (
            <>
              <p className="mt-3 text-sm leading-6 text-muted">
                Add PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV=sandbox to the server environment,
                then restart the app. Until those are set, this button does not contact a bank. The
                production build still runs without them.
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Wealth Guides see totals, Freedom Score, and goal progress only. Not institution
                names, account numbers, or transactions.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">{dialog.message}</p>
          )}
        </PlaidDialog>
      ) : null}
    </div>
  );
}

function ConnectedGroup({
  item,
  confirming,
  busy,
  onAskRemove,
  onCancel,
  onRemove,
}: {
  item: ConnectedItem;
  confirming: boolean;
  busy: boolean;
  onAskRemove: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-background px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{item.institutionName}</p>
          <p className="mt-1 text-xs text-muted">
            {item.accounts.length === 0
              ? "No accounts came back on this connection."
              : `${item.accounts.length} account${item.accounts.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {confirming ? (
          <div className="flex gap-2">
            <button type="button" className="wc-btn wc-btn-primary" onClick={onRemove} disabled={busy}>
              {busy ? "Removing…" : "Remove"}
            </button>
            <button type="button" className="wc-btn wc-btn-ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="wc-btn wc-btn-ghost" onClick={onAskRemove} disabled={busy}>
            Remove connection
          </button>
        )}
      </div>
      {item.accounts.length > 0 ? (
        <ul className="mt-4 divide-y divide-line">
          {item.accounts.map((account) => (
            <li key={account.id} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm text-ink">
                  {account.name}
                  {account.mask ? <span className="text-muted"> {maskDisplay(account.mask)}</span> : null}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">
                  {humanType(account.type, account.subtype)} · {account.bucket === "liability" ? "Liability" : "Asset"}
                </p>
              </div>
              <p className="text-sm font-medium text-ink">{formatMoney(account.balance, true)}</p>
            </li>
          ))}
        </ul>
      ) : null}
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

function PlaidDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
          {title}
        </h2>
        {children}
        <div className="mt-6 flex justify-end">
          <button ref={closeRef} type="button" className="wc-btn wc-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
