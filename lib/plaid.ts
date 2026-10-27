import type { AccountBase, PlaidApi } from "plaid";
import { prisma } from "@/lib/db";
import { plaidCredentials } from "@/lib/plaid-config";
import {
  institutionLabel,
  isPublicToken,
  normalizedType,
  subtypeLabel,
  type PlaidBalanceAccount,
} from "@/lib/plaid-labels";
import { deleteLocalPlaidItem, saveSyncedItem } from "@/lib/plaid-store";
import { canStoreAccessTokens, decryptAccessToken, encryptAccessToken } from "@/lib/token-crypto";

async function plaidClient(): Promise<PlaidApi | null> {
  const creds = plaidCredentials();
  if (!creds) return null;
  const { Configuration, PlaidApi, PlaidEnvironments } = await import("plaid");
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[creds.env],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": creds.clientId,
          "PLAID-SECRET": creds.secret,
        },
      },
    }),
  );
}

function plaidErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("response" in error)) return "";
  const data = (error as { response?: { data?: { error_code?: unknown } } }).response?.data;
  return typeof data?.error_code === "string" ? data.error_code : "";
}

function publicPlaidError(error: unknown): string {
  const code = plaidErrorCode(error);
  if (/^[A-Z0-9_]{1,80}$/.test(code)) {
    return `Plaid could not complete that request (${code}).`;
  }
  return "Plaid could not complete that request.";
}

function toBalanceAccount(account: AccountBase): PlaidBalanceAccount {
  return {
    accountId: account.account_id,
    name: account.name ?? "",
    officialName: account.official_name,
    type: normalizedType(account.type),
    subtype: subtypeLabel(account.subtype ?? ""),
    mask: account.mask ?? "",
    current: account.balances.current,
    available: account.balances.available,
  };
}

export async function createLinkToken(memberId: string): Promise<{ linkToken: string } | { error: string }> {
  const client = await plaidClient();
  if (!client) return { error: "Plaid is not configured." };
  const { CountryCode, Products } = await import("plaid");
  const request = {
    user: { client_user_id: memberId },
    client_name: "Wealth Creators",
    language: "en",
    country_codes: [CountryCode.Us],
    products: [Products.Transactions],
  };
  try {
    const created = await client.linkTokenCreate({
      ...request,
      optional_products: [Products.Investments],
    });
    return { linkToken: created.data.link_token };
  } catch {
    // A sandbox app that has not enabled Investments rejects the optional product.
    // Transactions alone still opens Link for bank accounts.
  }
  try {
    const created = await client.linkTokenCreate(request);
    return { linkToken: created.data.link_token };
  } catch (error) {
    return { error: publicPlaidError(error) };
  }
}

async function fetchAccounts(client: PlaidApi, accessToken: string) {
  try {
    return (await client.accountsBalanceGet({ access_token: accessToken })).data;
  } catch (error) {
    const code = plaidErrorCode(error);
    if (code !== "INVALID_PRODUCT" && code !== "PRODUCTS_NOT_SUPPORTED" && code !== "ADDITIONAL_CONSENT_REQUIRED") {
      throw error;
    }
  }
  return (await client.accountsGet({ access_token: accessToken })).data;
}

export async function exchangeAndSync(
  memberId: string,
  publicToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canStoreAccessTokens()) {
    return { ok: false, error: "AUTH_SECRET is missing, so a bank connection cannot be stored." };
  }
  if (!isPublicToken(publicToken)) {
    return { ok: false, error: "That Plaid token could not be used." };
  }
  const client = await plaidClient();
  if (!client) return { ok: false, error: "Plaid is not configured." };

  let accessToken = "";
  try {
    const exchanged = await client.itemPublicTokenExchange({ public_token: publicToken });
    accessToken = exchanged.data.access_token;
    const accounts = await client.accountsGet({ access_token: accessToken });
    const encrypted = encryptAccessToken(accessToken);
    await saveSyncedItem({
      memberId,
      itemId: exchanged.data.item_id,
      accessTokenEnc: encrypted,
      institutionId: accounts.data.item.institution_id ?? "",
      institutionName: institutionLabel(accounts.data.item.institution_name),
      accounts: accounts.data.accounts.map(toBalanceAccount),
    });
    accessToken = "";
    return { ok: true };
  } catch (error) {
    const owned = error instanceof Error && error.message === "PLAID_ITEM_OWNED";
    if (accessToken && !owned) {
      try {
        await client.itemRemove({ access_token: accessToken });
      } catch {
        // The local row was not saved. The Item can be removed from the Plaid dashboard.
      }
    }
    accessToken = "";
    if (owned) {
      return { ok: false, error: "That institution is already connected to another member." };
    }
    return { ok: false, error: publicPlaidError(error) };
  }
}

export async function refreshMemberBalances(
  memberId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = await plaidClient();
  if (!client) return { ok: false, error: "Plaid is not configured." };
  const items = await prisma.plaidItem.findMany({
    where: { memberId },
    select: { itemId: true, accessTokenEnc: true, institutionId: true, institutionName: true },
  });
  if (items.length === 0) return { ok: true };
  let failed = 0;
  for (const item of items) {
    try {
      const accessToken = decryptAccessToken(item.accessTokenEnc);
      const accounts = await fetchAccounts(client, accessToken);
      await saveSyncedItem({
        memberId,
        itemId: item.itemId,
        institutionId: accounts.item.institution_id ?? item.institutionId,
        institutionName: institutionLabel(accounts.item.institution_name ?? item.institutionName),
        accounts: accounts.accounts.map(toBalanceAccount),
      });
    } catch {
      failed += 1;
    }
  }
  if (failed > 0) return { ok: false, error: "Some balances could not be refreshed." };
  return { ok: true };
}

export async function disconnectItem(
  memberId: string,
  itemRecordId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const item = await prisma.plaidItem.findFirst({
    where: { id: itemRecordId, memberId },
    select: { id: true, accessTokenEnc: true },
  });
  if (!item) return { ok: false, error: "That connection is not on this plan." };
  const client = await plaidClient();
  if (client) {
    try {
      const accessToken = decryptAccessToken(item.accessTokenEnc);
      await client.itemRemove({ access_token: accessToken });
    } catch {
      // Drop the local Item either way so the member is not stuck with it.
    }
  }
  const removed = await deleteLocalPlaidItem(memberId, item.id);
  if (!removed) return { ok: false, error: "That connection is not on this plan." };
  return { ok: true };
}
