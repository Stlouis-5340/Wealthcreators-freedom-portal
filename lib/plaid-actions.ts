"use server";

import { auth, isPortalRole } from "@/auth";
import { createLinkToken, disconnectItem, exchangeAndSync, refreshMemberBalances } from "@/lib/plaid";
import { isPlaidConfigured, type LinkTokenResult, type PlaidActionResult } from "@/lib/plaid-config";

async function memberId(): Promise<string | null> {
  const session = await auth();
  const user = session?.user;
  if (!user || !isPortalRole(user.role) || user.role !== "member" || !user.id) return null;
  return user.id;
}

export async function createLinkTokenAction(): Promise<LinkTokenResult> {
  if (!isPlaidConfigured()) return { configured: false };
  const id = await memberId();
  if (!id) return { configured: true, error: "Sign in as a member to connect an account." };
  const result = await createLinkToken(id);
  if ("linkToken" in result) return { configured: true, linkToken: result.linkToken };
  return { configured: true, error: result.error };
}

export async function exchangePublicTokenAction(publicToken: string): Promise<PlaidActionResult> {
  if (!isPlaidConfigured()) return { ok: false, error: "Plaid is not configured." };
  const id = await memberId();
  if (!id) return { ok: false, error: "Sign in as a member to connect an account." };
  return exchangeAndSync(id, publicToken);
}

export async function refreshPlaidBalancesAction(): Promise<PlaidActionResult> {
  if (!isPlaidConfigured()) return { ok: false, error: "Plaid is not configured." };
  const id = await memberId();
  if (!id) return { ok: false, error: "Sign in as a member to refresh balances." };
  return refreshMemberBalances(id);
}

export async function disconnectPlaidItemAction(itemRecordId: string): Promise<PlaidActionResult> {
  const id = await memberId();
  if (!id) return { ok: false, error: "Sign in as a member to remove a connection." };
  if (!itemRecordId || itemRecordId.length > 80) {
    return { ok: false, error: "That connection is not on this plan." };
  }
  return disconnectItem(id, itemRecordId);
}
