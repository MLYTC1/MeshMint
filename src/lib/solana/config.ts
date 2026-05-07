import { clusterApiUrl, type Cluster } from "@solana/web3.js";

/**
 * Mesh Mint — Solana configuration.
 * All values can be overridden via Vite env vars (VITE_*).
 */
export const SOLANA_CLUSTER: Cluster =
  (import.meta.env.VITE_SOLANA_CLUSTER as Cluster) || "devnet";

export const SOLANA_RPC_URL: string =
  import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(SOLANA_CLUSTER);

/** Anchor program ID for the Mesh Mint marketplace program. Replace with your deployed ID. */
export const MESH_MINT_PROGRAM_ID: string =
  import.meta.env.VITE_MESH_MINT_PROGRAM_ID ||
  "11111111111111111111111111111111";

/** Treasury / fee recipient wallet. */
export const TREASURY_WALLET: string =
  import.meta.env.VITE_TREASURY_WALLET || "11111111111111111111111111111111";

/** USDC mint (devnet default). */
export const USDC_MINT: string =
  import.meta.env.VITE_USDC_MINT ||
  "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

/** Asset storage endpoint (e.g., IPFS gateway, Arweave, S3). */
export const ASSET_STORAGE_ENDPOINT: string =
  import.meta.env.VITE_ASSET_STORAGE_ENDPOINT ||
  "https://gateway.pinata.cloud/ipfs/";

/** Platform fee in basis points (e.g. 250 = 2.5%). */
export const PLATFORM_FEE_BPS = Number(
  import.meta.env.VITE_PLATFORM_FEE_BPS || 250
);
