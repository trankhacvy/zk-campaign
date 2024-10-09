import {
  MerkleContext,
  PackedMerkleContext,
} from "@lightprotocol/stateless.js";
import {
  AccountMeta,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
} from "@solana/web3.js";

export const insertOrGet = (
  remainingAccounts: Array<AccountMeta>,
  key: PublicKey
): number => {
  const index = remainingAccounts.findIndex((account) =>
    account.pubkey.equals(key)
  );
  if (index === -1) {
    remainingAccounts.push({
      pubkey: key,
      isSigner: false,
      isWritable: true,
    });
    return remainingAccounts.length - 1;
  }
  return index;
};

export const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
  units: 900_000,
});

export const setComputeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1,
});

export async function dateToSolanaSlot(
  targetDate: Date,
  connection: Connection
): Promise<number> {
  try {
    const epochInfo = await connection.getEpochInfo();

    const currentSlot = epochInfo.absoluteSlot;
    const currentSlotTimestamp = await connection.getBlockTime(currentSlot);

    if (!currentSlotTimestamp) {
      throw new Error("Failed to get block time for the current slot.");
    }

    const currentSlotTimeInMillis = currentSlotTimestamp * 1000;

    const targetTimeInMillis = targetDate.getTime();
    const timeDifferenceInMillis = targetTimeInMillis - currentSlotTimeInMillis;

    const SOLANA_SLOT_TIME_MS = 400;

    const additionalSlots = Math.floor(
      timeDifferenceInMillis / SOLANA_SLOT_TIME_MS
    );

    const targetSlot = currentSlot + additionalSlots;

    return targetSlot;
  } catch (error) {
    console.error("Error calculating slot:", error);
    throw error;
  }
}

export function packMerkleContext(
  merkleContext: MerkleContext,
  remainingAccounts: Array<AccountMeta>
): PackedMerkleContext {
  const merkleTreePubkeyIndex = insertOrGet(
    remainingAccounts,
    merkleContext.merkleTree
  );

  const nullifierQueuePubkeyIndex = insertOrGet(
    remainingAccounts,
    merkleContext.nullifierQueue
  );

  return {
    merkleTreePubkeyIndex,
    nullifierQueuePubkeyIndex,
    leafIndex: merkleContext.leafIndex,
    queueIndex: null,
  };
}
