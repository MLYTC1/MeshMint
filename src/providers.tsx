import { SolanaProvider } from "@solana/react-hooks";
import { autoDiscover, createClient } from "@solana/client";
import type { PropsWithChildren } from "react";
import { SOLANA_RPC_URL } from "@/lib/solana/config";

/**
 * Solana client — created once at module scope.
 *
 * This mirrors the official `@solana/react-hooks` + `@solana/client` quickstart
 * pattern used by the `react-vite-anchor` template:
 *
 *   const client = createClient({ endpoint, walletConnectors: autoDiscover() });
 *   <SolanaProvider client={client}>...</SolanaProvider>
 *
 * Auto-discovery picks up any Wallet-Standard-compatible browser wallet
 * (Phantom, Solflare, Backpack, …) without per-wallet code paths.
 */
const client = createClient({
  endpoint: SOLANA_RPC_URL,
  walletConnectors: autoDiscover(),
});

export function Providers({ children }: PropsWithChildren) {
  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}
