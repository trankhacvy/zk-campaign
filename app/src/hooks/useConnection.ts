import { useConnection } from "@solana/wallet-adapter-react";
import useSWRImmutable from "swr/immutable";
import { createRpc } from "@lightprotocol/stateless.js";

export const useRpc = () => {
  const { connection } = useConnection();

  const swr = useSWRImmutable(["rpc", connection.rpcEndpoint], () =>
    createRpc(
      connection.rpcEndpoint,
      connection.rpcEndpoint.startsWith("http://")
        ? undefined
        : connection.rpcEndpoint,
      undefined,
      {
        commitment: connection.commitment,
      }
    )
  );

  return swr.data;
};
