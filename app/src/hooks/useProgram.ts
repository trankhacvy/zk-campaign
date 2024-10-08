import { Program, Provider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import useSWRImmutable from "swr/immutable";
import idl from "../../../target/idl/mit.json";
import { Mit } from "../../../target/types/mit";

const KEYPAIR = Keypair.generate();

const PROGRAM_ID = new PublicKey(
  "7zF2xa5P22ahMqdQYo9P4kjD4qxvUy5hGozmk8DyB3iz"
);

export const useMitProgram = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const swr = useSWRImmutable(
    ["program", connection.rpcEndpoint],
    () =>
      new Program(
        idl as unknown as Mit,
        PROGRAM_ID,
        wallet
          ? // @ts-ignore
            (wallet as Provider)
          : {
              connection,
              publicKey: KEYPAIR.publicKey,
            }
      )
  );

  return swr.data;
};
