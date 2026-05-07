import { AnchorProvider } from "@coral-xyz/anchor";
import type { Connection } from "@solana/web3.js";

/**
 * Build an AnchorProvider from a wallet-adapter wallet (or compatible).
 */
export function buildAnchorProvider(
  connection: Connection,
  wallet: unknown
): AnchorProvider {
  return new AnchorProvider(connection, wallet as never, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}
