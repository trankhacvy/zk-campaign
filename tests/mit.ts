import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mit } from "../target/types/mit";
import idl from "../target/idl/mit.json";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SYSVAR_SLOT_HASHES_PUBKEY,
  Connection,
} from "@solana/web3.js";
import {
  CompressedAccountWithMerkleContext,
  LightSystemProgram,
  NewAddressParams,
  Rpc,
  bn,
  buildAndSignTx,
  createAccount,
  createRpc,
  defaultStaticAccountsStruct,
  defaultTestStateTreeAccounts,
  deriveAddress,
  hashToBn254FieldSizeBe,
  packCompressedAccounts,
  packNewAddressParams,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import fs from "fs";

const setComputeUnitLimitIx =
  anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: 900_000,
  });
const setComputeUnitPriceIx =
  anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1,
  });

const keypair = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(fs.readFileSync("target/deploy/mit-keypair.json", "utf-8"))
  )
);

describe("purr", () => {
  // Configure the client to use the local cluster.

  // const provider = anchor.AnchorProvider.env();
  // anchor.setProvider(provider);

  // const program = anchor.workspace.Mit as Program<Mit>;

  const program = new Program<Mit>(
    idl as any,
    "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",

    // provider
    new anchor.AnchorProvider(
      new Connection("http://localhost:8899", {
        commitment: "confirmed",
      }),
      new anchor.Wallet(keypair),
      {
        commitment: "confirmed",
      }
    )
  );

  // const connection: Rpc = createRpc(
  //   program.provider.connection.rpcEndpoint,
  //   // program.provider.connection.rpcEndpoint,
  //   undefined,
  //   undefined,
  //   {
  //     commitment: "confirmed",
  //   }
  // );

  it("Can create compressed account", async () => {
    console.log("hahaha");
  });
});
