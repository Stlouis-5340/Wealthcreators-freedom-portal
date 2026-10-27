import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assetLineId, liabilityLineId } from "@/lib/plaid-ids";
import {
  accountBalance,
  accountDisplayName,
  accountMask,
  assetGroupForType,
  balanceBucket,
  institutionLabel,
  liabilityNote,
  normalizedType,
  subtypeLabel,
  type PlaidBalanceAccount,
} from "@/lib/plaid-labels";

export async function saveSyncedItem(input: {
  memberId: string;
  itemId: string;
  accessTokenEnc?: string;
  institutionId: string;
  institutionName: string;
  accounts: PlaidBalanceAccount[];
}): Promise<void> {
  const institutionName = institutionLabel(input.institutionName);
  const institutionId = input.institutionId.slice(0, 80);
  await prisma.$transaction(async (tx) => {
    const owned = await tx.plaidItem.findUnique({
      where: { itemId: input.itemId },
      select: { memberId: true },
    });
    if (owned && owned.memberId !== input.memberId) {
      throw new Error("PLAID_ITEM_OWNED");
    }
    if (!owned && !input.accessTokenEnc) {
      throw new Error("PLAID_TOKEN_MISSING");
    }
    const item = await tx.plaidItem.upsert({
      where: { itemId: input.itemId },
      create: {
        memberId: input.memberId,
        itemId: input.itemId,
        accessTokenEnc: input.accessTokenEnc ?? "",
        institutionId,
        institutionName,
      },
      update: {
        institutionId,
        institutionName,
        ...(input.accessTokenEnc ? { accessTokenEnc: input.accessTokenEnc } : {}),
      },
    });

    const ordered = [...input.accounts].sort(
      (a, b) => a.name.localeCompare(b.name) || a.accountId.localeCompare(b.accountId),
    );
    const seen = new Set<string>();
    for (const [index, account] of ordered.entries()) {
      if (!account.accountId || seen.has(account.accountId)) continue;
      seen.add(account.accountId);
      await upsertAccount(tx, {
        memberId: input.memberId,
        itemRecordId: item.id,
        institutionName,
        account,
        sort: 1000 + index,
      });
    }

    const stale = await tx.plaidAccount.findMany({
      where:
        seen.size > 0
          ? { itemRecordId: item.id, plaidAccountId: { notIn: [...seen] } }
          : { itemRecordId: item.id },
      select: { id: true, assetLineId: true, liabilityLineId: true },
    });
    for (const row of stale) {
      await deleteLinkedLines(tx, input.memberId, row.assetLineId, row.liabilityLineId);
      await tx.plaidAccount.delete({ where: { id: row.id } });
    }
  });
}

async function upsertAccount(
  tx: Prisma.TransactionClient,
  input: {
    memberId: string;
    itemRecordId: string;
    institutionName: string;
    account: PlaidBalanceAccount;
    sort: number;
  },
): Promise<void> {
  const bucket = balanceBucket(input.account.type);
  const name = accountDisplayName(input.account);
  const type = normalizedType(input.account.type);
  const subtype = subtypeLabel(input.account.subtype);
  const mask = accountMask(input.account.mask);
  const balance = accountBalance(input.account);
  const nextAssetId = bucket === "asset" ? assetLineId(input.account.accountId) : null;
  const nextLiabilityId = bucket === "liability" ? liabilityLineId(input.account.accountId) : null;
  const existing = await tx.plaidAccount.findUnique({
    where: { plaidAccountId: input.account.accountId },
    select: { assetLineId: true, liabilityLineId: true, item: { select: { memberId: true } } },
  });
  if (existing && existing.item.memberId !== input.memberId) {
    throw new Error("PLAID_ITEM_OWNED");
  }
  if (existing?.assetLineId && existing.assetLineId !== nextAssetId) {
    await tx.assetLine.deleteMany({ where: { id: existing.assetLineId, memberId: input.memberId } });
  }
  if (existing?.liabilityLineId && existing.liabilityLineId !== nextLiabilityId) {
    await tx.liabilityLine.deleteMany({
      where: { id: existing.liabilityLineId, memberId: input.memberId },
    });
  }
  if (nextAssetId) {
    await tx.assetLine.upsert({
      where: { id: nextAssetId },
      create: {
        id: nextAssetId,
        memberId: input.memberId,
        name,
        institution: input.institutionName,
        group: assetGroupForType(type),
        balance,
        sort: input.sort,
      },
      update: {
        memberId: input.memberId,
        name,
        institution: input.institutionName,
        group: assetGroupForType(type),
        balance,
      },
    });
  }
  if (nextLiabilityId) {
    await tx.liabilityLine.upsert({
      where: { id: nextLiabilityId },
      create: {
        id: nextLiabilityId,
        memberId: input.memberId,
        name,
        balance,
        note: liabilityNote(input.institutionName, type, subtype),
        sort: input.sort,
      },
      update: {
        memberId: input.memberId,
        name,
        balance,
        note: liabilityNote(input.institutionName, type, subtype),
      },
    });
  }
  await tx.plaidAccount.upsert({
    where: { plaidAccountId: input.account.accountId },
    create: {
      itemRecordId: input.itemRecordId,
      plaidAccountId: input.account.accountId,
      name,
      type,
      subtype,
      mask,
      balance,
      assetLineId: nextAssetId,
      liabilityLineId: nextLiabilityId,
    },
    update: {
      itemRecordId: input.itemRecordId,
      name,
      type,
      subtype,
      mask,
      balance,
      assetLineId: nextAssetId,
      liabilityLineId: nextLiabilityId,
    },
  });
}

async function deleteLinkedLines(
  tx: Prisma.TransactionClient,
  memberId: string,
  assetLineId: string | null,
  liabilityLineId: string | null,
): Promise<void> {
  if (assetLineId) {
    await tx.assetLine.deleteMany({ where: { id: assetLineId, memberId } });
  }
  if (liabilityLineId) {
    await tx.liabilityLine.deleteMany({ where: { id: liabilityLineId, memberId } });
  }
}

export async function deleteLocalPlaidItem(memberId: string, itemRecordId: string): Promise<boolean> {
  const item = await prisma.plaidItem.findFirst({
    where: { id: itemRecordId, memberId },
    select: {
      id: true,
      accounts: { select: { assetLineId: true, liabilityLineId: true } },
    },
  });
  if (!item) return false;
  const assetIds = item.accounts.flatMap((account) => (account.assetLineId ? [account.assetLineId] : []));
  const liabilityIds = item.accounts.flatMap((account) =>
    account.liabilityLineId ? [account.liabilityLineId] : [],
  );
  await prisma.$transaction(async (tx) => {
    if (assetIds.length > 0) {
      await tx.assetLine.deleteMany({ where: { memberId, id: { in: assetIds } } });
    }
    if (liabilityIds.length > 0) {
      await tx.liabilityLine.deleteMany({ where: { memberId, id: { in: liabilityIds } } });
    }
    await tx.plaidItem.delete({ where: { id: item.id } });
  });
  return true;
}
