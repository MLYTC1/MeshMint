import { useCallback, useMemo } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type TransactionSignature,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import type { LicenseType } from "@/types/mesh";

type WalletAdapterLike = {
  sendTransaction: (
    transaction: Transaction,
    connection: Connection
  ) => Promise<TransactionSignature>;
};

type MeshProgramActions = {
  walletAddress: string | null;
  createListing: (input: {
    assetId: string;
    priceSol: number;
    license: LicenseType;
  }) => Promise<TransactionSignature>;
  purchaseLicense: (input: {
    assetId: string;
  }) => Promise<TransactionSignature>;
};

const MARKETPLACE_PROGRAM_ID = new PublicKey(
  "HtQwAN1WeyKCrLkadB3rTNxZt7hmVkGB797Njz1m19xg"
);
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export function useMeshProgram() {
  const { wallet } = useWalletConnection();
  const walletAddress = wallet?.account.address.toString() ?? null;

  const sendMarketplaceAction = useCallback(
    async (action: "createListing" | "purchaseLicense", assetId: string) => {
      if (!walletAddress || !wallet?.sendTransaction) {
        throw new Error("Wallet is not connected");
      }

      const signer = new PublicKey(walletAddress);
      const instruction = new TransactionInstruction({
        keys: [{ pubkey: signer, isSigner: true, isWritable: true }],
        programId: MARKETPLACE_PROGRAM_ID,
        data: Buffer.from(`${action}:${assetId}`),
      });

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = signer;

      return (wallet as unknown as WalletAdapterLike).sendTransaction(
        transaction,
        connection
      );
    },
    [wallet, walletAddress]
  );

  return useMemo<MeshProgramActions | null>(() => {
    if (!walletAddress) return null;
    return {
      walletAddress,
      createListing: async ({ assetId }) =>
        sendMarketplaceAction("createListing", assetId),
      purchaseLicense: async ({ assetId }) =>
        sendMarketplaceAction("purchaseLicense", assetId),
    };
  }, [sendMarketplaceAction, walletAddress]);
}
