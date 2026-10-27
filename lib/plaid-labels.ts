import { nonNegative } from "@/lib/plans";

const assetTypes = new Set(["depository", "investment", "brokerage", "other"]);
const liabilityTypes = new Set(["credit", "loan"]);

export interface PlaidBalanceAccount {
  accountId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string;
  mask: string;
  current: number | null;
  available: number | null;
}

export function isSyncedLine(id: string): boolean {
  return id.startsWith("plaid-");
}

export function balanceBucket(type: string): "asset" | "liability" {
  return liabilityTypes.has(type) ? "liability" : "asset";
}

export function assetGroupForType(type: string): "Cash" | "Investments" {
  return type === "investment" || type === "brokerage" ? "Investments" : "Cash";
}

export function normalizedType(type: string): string {
  return assetTypes.has(type) || liabilityTypes.has(type) ? type : "other";
}

export function accountBalance(account: Pick<PlaidBalanceAccount, "type" | "current" | "available">): number {
  if (balanceBucket(account.type) === "liability") return nonNegative(account.current ?? 0);
  return nonNegative(account.current ?? account.available ?? 0);
}

export function accountMask(mask: string | null | undefined): string {
  if (!mask) return "";
  return mask.replace(/[^A-Za-z0-9]/g, "").slice(-4);
}

export function maskDisplay(mask: string): string {
  return mask ? `····${mask}` : "";
}

export function humanType(type: string, subtype: string): string {
  const raw = (subtype || type || "account").replace(/_/g, " ");
  return raw.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function stripLongDigits(value: string): string {
  return value.replace(/\d{5,}/g, " ").replace(/\s+/g, " ").trim();
}

export function accountDisplayName(account: Pick<PlaidBalanceAccount, "name" | "officialName">): string {
  const raw = account.name.trim() || account.officialName?.trim() || "Account";
  return (stripLongDigits(raw) || "Account").slice(0, 120);
}

export function institutionLabel(name: string | null | undefined): string {
  const trimmed = stripLongDigits(name ?? "") || "Connected institution";
  return trimmed.slice(0, 120);
}

export function subtypeLabel(subtype: string): string {
  return subtype.replace(/[^A-Za-z0-9_ -]/g, "").slice(0, 40);
}

export function liabilityNote(institution: string, type: string, subtype: string): string {
  return `${institutionLabel(institution)} · ${humanType(type, subtype)}`.slice(0, 180);
}

export function isPublicToken(value: string): boolean {
  return /^public-[A-Za-z0-9_-]{8,500}$/.test(value);
}
