import {
  CompressedAccount,
  CompressedAccountWithMerkleContext,
  CompressedProofWithContext,
  defaultTestStateTreeAccounts,
  getIndexOrAdd,
  LightSystemProgram,
  MerkleContext,
  NewAddressParams,
  packCompressedAccounts,
  PackedMerkleContext,
  packNewAddressParams,
} from "@lightprotocol/stateless.js";
import {
  AccountMeta,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import { keccak_256 } from "@noble/hashes/sha3";

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

export function packWithInput(
  inputCompressedAccounts: CompressedAccountWithMerkleContext[],
  outputCompressedAccounts: CompressedAccount[],
  newAddressesParams: NewAddressParams[],
  proof: CompressedProofWithContext
) {
  const {
    remainingAccounts: _remainingAccounts,
    packedInputCompressedAccounts,
  } = packCompressedAccounts(
    inputCompressedAccounts,
    proof.rootIndices,
    outputCompressedAccounts
  );
  const { newAddressParamsPacked, remainingAccounts } = packNewAddressParams(
    newAddressesParams,
    _remainingAccounts
  );
  let {
    addressMerkleTreeAccountIndex,
    addressMerkleTreeRootIndex,
    addressQueueAccountIndex,
  } = newAddressParamsPacked[0];
  const merkleContext = packedInputCompressedAccounts[0].merkleContext;
  return {
    addressMerkleContext: {
      addressMerkleTreePubkeyIndex: addressMerkleTreeAccountIndex,
      addressQueuePubkeyIndex: addressQueueAccountIndex,
    },
    addressMerkleTreeRootIndex,
    merkleContext,
    remainingAccounts,
  };
}

export function getNewAddressParams(
  addressSeed: Uint8Array,
  proof: CompressedProofWithContext
) {
  const addressParams: NewAddressParams = {
    seed: addressSeed,
    addressMerkleTreeRootIndex: proof.rootIndices[proof.rootIndices.length - 1],
    addressMerkleTreePubkey: proof.merkleTrees[proof.merkleTrees.length - 1],
    addressQueuePubkey: proof.nullifierQueues[proof.nullifierQueues.length - 1],
  };
  return addressParams;
}

function hashvToBn254FieldSizeBe(bytes: Uint8Array[]): Uint8Array {
  const hasher = keccak_256.create();
  for (const input of bytes) {
    hasher.update(input);
  }
  const hash = hasher.digest();
  hash[0] = 0;
  return hash;
}

export function deriveSeed(
  seeds: Uint8Array[],
  programId: PublicKey
): Uint8Array {
  const combinedSeeds: Uint8Array[] = [programId.toBytes(), ...seeds];
  const hash = hashvToBn254FieldSizeBe(combinedSeeds);
  return hash;
}

export function packNew(
  outputCompressedAccounts: CompressedAccount[],
  newAddressesParams: NewAddressParams[],
  proof: CompressedProofWithContext
) {
  const { merkleTree, nullifierQueue } = defaultTestStateTreeAccounts();

  const { remainingAccounts: _remainingAccounts } = packCompressedAccounts(
    [],
    proof.rootIndices,
    outputCompressedAccounts
  );
  const { newAddressParamsPacked, remainingAccounts } = packNewAddressParams(
    newAddressesParams,
    _remainingAccounts
  );
  let merkleContext: PackedMerkleContext = {
    leafIndex: 0,
    merkleTreePubkeyIndex: getIndexOrAdd(remainingAccounts, merkleTree),
    nullifierQueuePubkeyIndex: getIndexOrAdd(remainingAccounts, nullifierQueue),
    queueIndex: null,
  };
  let {
    addressMerkleTreeAccountIndex,
    addressMerkleTreeRootIndex,
    addressQueueAccountIndex,
  } = newAddressParamsPacked[0];
  return {
    addressMerkleContext: {
      addressMerkleTreePubkeyIndex: addressMerkleTreeAccountIndex,
      addressQueuePubkeyIndex: addressQueueAccountIndex,
    },
    addressMerkleTreeRootIndex,
    merkleContext,
    remainingAccounts,
  };
}

export function createNewAddressOutputState(
  address: PublicKey,
  programId: PublicKey
) {
  return LightSystemProgram.createNewAddressOutputState(
    Array.from(address.toBytes()),
    programId
  );
}
