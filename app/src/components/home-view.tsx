"use client";

import * as borsh from "borsh";
import { useRpc } from "@/hooks/useConnection";
import { useMitProgram } from "@/hooks/useProgram";
import { BN } from "@coral-xyz/anchor";
import {
  buildTx,
  bn,
  defaultStaticAccountsStruct,
  LightSystemProgram,
  deriveAddress,
  toAccountMetas,
} from "@lightprotocol/stateless.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  ComputeBudgetProgram,
  SystemProgram,
  AccountMeta,
} from "@solana/web3.js";
import dynamic from "next/dynamic";
import { campaignSchema } from "@/idl/schema";
import {
  createNewAddressOutputState,
  deriveSeed,
  getNewAddressParams,
  packNew,
  packWithInput,
} from "@/lib/helper";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
  units: 900_000,
});

const setComputeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1,
});

const campaignId = new BN(44);

export const HomeView = () => {
  const { publicKey, signTransaction } = useWallet();
  const program = useMitProgram();
  const rpc = useRpc();

  const handleClick = async () => {
    try {
      if (!program || !rpc || !publicKey || !signTransaction) {
        return;
      }

      const {
        accountCompressionAuthority,
        noopProgram,
        registeredProgramPda,
        accountCompressionProgram,
      } = defaultStaticAccountsStruct();

      // const { addressQueue, addressTree, merkleTree, nullifierQueue } =
      //   defaultTestStateTreeAccounts();

      const addressSeed = deriveSeed(
        [
          Buffer.from("campaign"),
          publicKey!.toBuffer(),
          campaignId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      let address = deriveAddress(addressSeed);

      console.log("address", address.toBase58());

      const assetProof = await rpc.getValidityProof(undefined, [
        bn(address.toBytes()),
      ]);

      console.log("assetProof", assetProof);

      if (!assetProof) {
        throw new Error("Failed to get base data hash");
      }

      const newAddressesParams = [];

      newAddressesParams.push(getNewAddressParams(addressSeed, assetProof));

      const outputCompressedAccounts = [];

      outputCompressedAccounts.push(
        ...LightSystemProgram.createNewAddressOutputState(
          Array.from(address.toBytes()),
          program.programId
        )
      );

      const {
        addressMerkleContext,
        addressMerkleTreeRootIndex,
        merkleContext,
        remainingAccounts,
      } = packNew(outputCompressedAccounts, newAddressesParams, assetProof);

      // const remainingAccounts: Array<AccountMeta> = [];

      // const merkleContext: PackedMerkleContext = {
      //   merkleTreePubkeyIndex: insertOrGet(remainingAccounts, merkleTree),
      //   nullifierQueuePubkeyIndex: insertOrGet(
      //     remainingAccounts,
      //     nullifierQueue
      //   ),
      //   leafIndex: 0,
      //   queueIndex: null,
      // };

      // const addressMerkleContext = {
      //   addressMerkleTreePubkeyIndex: insertOrGet(
      //     remainingAccounts,
      //     addressTree
      //   ),
      //   addressQueuePubkeyIndex: insertOrGet(remainingAccounts, addressQueue),
      // };

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), publicKey!.toBuffer()],
        program.programId
      );

      console.log("vaultPda", vaultPda.toBase58());

      const ix = await program.methods
        .create(
          [] as any,
          assetProof.compressedProof,
          merkleContext,
          0,
          addressMerkleContext,
          addressMerkleTreeRootIndex,
          campaignId,
          {
            name: "abc",
            ctaLink: "https://google.com",
            logo: "hahah",
            startDate: new BN(100),
            endDate: new BN(100),
            budget: new BN(100),
            ratePerClick: new BN(100),
            clicks: new BN(100),
            remainingBudget: new BN(100),
            status: {
              upcoming: {},
            },
          }
        )
        .accounts({
          signer: publicKey,
          selfProgram: program.programId,
          cpiSigner: PublicKey.findProgramAddressSync(
            [Buffer.from("cpi_authority")],
            program.programId
          )[0],
          vault: vaultPda,
          // misc
          systemProgram: SystemProgram.programId,
          accountCompressionAuthority,
          accountCompressionProgram,
          noopProgram,
          registeredProgramPda,
          lightSystemProgram: LightSystemProgram.programId,
        })
        .remainingAccounts(toAccountMetas(remainingAccounts))
        .instruction();

      const blockhash = await rpc.getLatestBlockhash();

      const tx = buildTx(
        [setComputeUnitLimitIx, setComputeUnitPriceIx, ix],
        publicKey,
        blockhash.blockhash
      );

      console.log("txSize:", tx.serialize().byteLength);

      const signedTx = await signTransaction(tx);

      const txSig = await rpc.sendTransaction(signedTx);

      await rpc.confirmTransaction({
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        signature: txSig,
      });

      console.log("txSig", txSig);
    } catch (error) {
      console.error(error);
    }
  };

  const registerAff = async () => {
    try {
      if (!program || !rpc || !publicKey || !signTransaction) {
        return;
      }

      const {
        accountCompressionAuthority,
        noopProgram,
        registeredProgramPda,
        accountCompressionProgram,
      } = defaultStaticAccountsStruct();

      const campaignAddressSeed = deriveSeed(
        [
          Buffer.from("campaign"),
          publicKey!.toBuffer(),
          campaignId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const campaignAddress = deriveAddress(campaignAddressSeed);

      const campaignData = await rpc.getCompressedAccount(
        bn(campaignAddress.toBytes())
      );

      console.log("campaignData", campaignData);

      if (!campaignData || !campaignData.data) {
        throw new Error("Failed to get campaignData data hash");
      }

      const affiliateAddressSeed = deriveSeed(
        [Buffer.from("affiliate"), publicKey!.toBuffer()],
        program.programId
      );

      const affiliateAddress = deriveAddress(affiliateAddressSeed);

      console.log("affiliateAddressSeed", affiliateAddress.toBase58());

      const proof = await rpc.getValidityProof(
        [bn(campaignData.hash)],
        [bn(affiliateAddress.toBytes())]
      );

      console.log("assetProof", proof);

      if (!proof) {
        throw new Error("Failed to get affiliateProof base data hash");
      }

      const outputCompressedAccounts = [];

      outputCompressedAccounts.push(
        ...createNewAddressOutputState(campaignAddress, program.programId)
      );

      outputCompressedAccounts.push(
        ...createNewAddressOutputState(affiliateAddress, program.programId)
      );

      const newAddressesParams = [];

      newAddressesParams.push(getNewAddressParams(affiliateAddressSeed, proof));

      const {
        addressMerkleContext,
        addressMerkleTreeRootIndex,
        merkleContext,
        remainingAccounts,
      } = packWithInput(
        [campaignData],
        outputCompressedAccounts,
        newAddressesParams,
        proof
      );

      const ix = await program.methods
        .registerV2(
          [campaignData.data.data],
          proof.compressedProof,
          merkleContext,
          proof.rootIndices[0],
          addressMerkleContext,
          addressMerkleTreeRootIndex,
          campaignId
        )
        .accounts({
          signer: publicKey,
          selfProgram: program.programId,
          cpiSigner: PublicKey.findProgramAddressSync(
            [Buffer.from("cpi_authority")],
            program.programId
          )[0],
          // misc
          systemProgram: SystemProgram.programId,
          accountCompressionAuthority,
          accountCompressionProgram,
          noopProgram,
          registeredProgramPda,
          lightSystemProgram: LightSystemProgram.programId,
        })
        .remainingAccounts(toAccountMetas(remainingAccounts))
        .instruction();

      const blockhash = await rpc.getLatestBlockhash();

      const tx = buildTx(
        [setComputeUnitLimitIx, setComputeUnitPriceIx, ix],
        publicKey,
        blockhash.blockhash
      );

      console.log("txSize:", tx.serialize().byteLength);

      const signedTx = await signTransaction(tx);

      const txSig = await rpc.sendTransaction(signedTx);

      await rpc.confirmTransaction({
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        signature: txSig,
      });

      console.log("txSig", txSig);
    } catch (error) {
      console.error(error);
    }
  };

  const increase = async () => {
    try {
      if (!program || !rpc || !publicKey || !signTransaction) {
        return;
      }

      const accounts = await rpc.getCompressedAccountsByOwner(
        program.programId
      );

      console.log("accounts", accounts.items[0]);

      // const metadata = CampaignLayout.decode(accounts.items[0].data?.data!);

      const metadata = borsh.deserialize(
        campaignSchema,
        accounts.items[0].data?.data!
      );

      console.log("parsed", metadata);

      // const {
      //   accountCompressionAuthority,
      //   noopProgram,
      //   registeredProgramPda,
      //   accountCompressionProgram,
      // } = defaultStaticAccountsStruct();

      // const { addressQueue, addressTree, merkleTree, nullifierQueue } =
      //   defaultTestStateTreeAccounts();

      // const addressSeed = deriveAddressSeed(
      //   [Buffer.from("counter1"), publicKey!.toBuffer()],
      //   program.programId
      // );

      // let address = deriveAddress(addressSeed);

      // console.log("address", address.toBase58());

      // const assetData = await rpc.getCompressedAccount(bn(address.toBytes()));

      // if (!assetData || !assetData.data) {
      //   throw new Error("Failed to get base data hash");
      // }

      // const assetHash = assetData.hash;

      // const assetProof = await rpc.getValidityProofV0(
      //   [
      //     {
      //       hash: bn(Uint8Array.from(assetHash)),
      //       tree: addressTree,
      //       queue: addressQueue,
      //     },
      //   ],
      //   undefined
      // );

      // const remainingAccounts: Array<AccountMeta> = [];

      // const merkleContext: PackedMerkleContext = {
      //   merkleTreePubkeyIndex: insertOrGet(remainingAccounts, merkleTree),
      //   nullifierQueuePubkeyIndex: insertOrGet(
      //     remainingAccounts,
      //     nullifierQueue
      //   ),
      //   leafIndex: 0,
      //   queueIndex: null,
      // };

      // const addressMerkleContext = {
      //   addressMerkleTreePubkeyIndex: insertOrGet(
      //     remainingAccounts,
      //     addressTree
      //   ),
      //   addressQueuePubkeyIndex: insertOrGet(remainingAccounts, addressQueue),
      // };

      // console.log("xyzzz", assetProof.rootIndices[0]);

      // const ix = await program.methods
      //   .increment(
      //     [] as any,
      //     assetProof.compressedProof,
      //     merkleContext,
      //     assetProof.rootIndices[0],
      //     addressMerkleContext,
      //     0
      //   )
      //   .accounts({
      //     signer: publicKey,
      //     selfProgram: program.programId,
      //     cpiSigner: PublicKey.findProgramAddressSync(
      //       [Buffer.from("cpi_authority")],
      //       program.programId
      //     )[0],
      //     // misc
      //     systemProgram: SystemProgram.programId,
      //     accountCompressionAuthority,
      //     accountCompressionProgram,
      //     noopProgram,
      //     registeredProgramPda,
      //     lightSystemProgram: LightSystemProgram.programId,
      //   })
      //   .remainingAccounts(remainingAccounts)
      //   .instruction();

      // const blockhash = await rpc.getLatestBlockhash();

      // const tx = buildTx(
      //   [setComputeUnitLimitIx, setComputeUnitPriceIx, ix],
      //   publicKey,
      //   blockhash.blockhash
      // );

      // console.log("txSize:", tx.serialize().byteLength);

      // const signedTx = await signTransaction(tx);

      // const txSig = await rpc.sendTransaction(signedTx);

      // await rpc.confirmTransaction({
      //   blockhash: blockhash.blockhash,
      //   lastValidBlockHeight: blockhash.lastValidBlockHeight,
      //   signature: txSig,
      // });

      // console.log("txSig", txSig);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-10">
      <WalletMultiButtonDynamic />

      <button onClick={handleClick}>Send</button>
      <button onClick={registerAff}>Register</button>
      <button onClick={increase}>Increase</button>
    </div>
  );
};

const insertOrGet = (
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
