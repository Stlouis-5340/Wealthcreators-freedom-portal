import { createHash } from "node:crypto";

function lineKey(accountId: string): string {
  if (/^[A-Za-z0-9_-]{1,160}$/.test(accountId)) return accountId;
  return createHash("sha256").update(accountId).digest("hex").slice(0, 40);
}

export function assetLineId(accountId: string): string {
  return `plaid-${lineKey(accountId)}`;
}

export function liabilityLineId(accountId: string): string {
  return `plaid-lia-${lineKey(accountId)}`;
}
