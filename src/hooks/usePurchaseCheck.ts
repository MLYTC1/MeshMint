import { useEffect, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { address, createSolanaRpc, type Address } from "@solana/kit";
import { findPurchasePda, fetchMaybePurchase } from "@/generated/marketplace";
import { SOLANA_RPC_URL } from "@/lib/solana/config";

export type PurchaseStatus =
  | "idle"
  | "checking"
  | "owned"
  | "not-owned"
  | "error";

/**
 * Check if the connected wallet owns a Purchase PDA for the given asset.
 * This verifies on-chain that the buyer holds a valid license.
 *
 * - "idle"      — no wallet connected or no asset address provided.
 * - "checking"  — RPC call in flight.
 * - "owned"     — Purchase PDA exists on chain.
 * - "not-owned" — PDA does not exist.
 * - "error"     — check failed (network issue, etc.).
 */
export function usePurchaseCheck(assetAddress: string | undefined): {
  status: PurchaseStatus;
  recheck: () => void;
} {
  const { wallet } = useWalletConnection();
  const buyerAddress = wallet?.account.address.toString();

  const [status, setStatus] = useState<PurchaseStatus>("idle");
  const [recheckCount, setRecheckCount] = useState(0);

  useEffect(() => {
    if (!buyerAddress || !assetAddress) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("checking");

    (async () => {
      try {
        const buyer = address(buyerAddress) as Address;
        const asset = address(assetAddress) as Address;
        const [purchasePda] = await findPurchasePda({ buyer, asset });

        const rpc = createSolanaRpc(SOLANA_RPC_URL);
        const account = await fetchMaybePurchase(rpc, purchasePda);

        if (cancelled) return;
        setStatus(account.exists ? "owned" : "not-owned");
      } catch (err) {
        if (cancelled) return;
        console.warn("[usePurchaseCheck] verification failed", err);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [buyerAddress, assetAddress, recheckCount]);

  return {
    status,
    recheck: () => setRecheckCount((n) => n + 1),
  };
}
