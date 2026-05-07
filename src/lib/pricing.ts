import type { Currency, MeshAsset } from "@/types/mesh";
import { USDC_MINT } from "@/lib/solana/config";

/**
 * Multi-token payment abstraction.
 * Add new tokens here (e.g. USDT) without touching UI components.
 */
export interface TokenConfig {
  symbol: Currency;
  label: string;
  decimals: number;
  mint?: string; // SPL token mint (undefined = native SOL)
}

export const TOKENS: Record<Currency, TokenConfig> = {
  SOL: { symbol: "SOL", label: "SOL", decimals: 9 },
  USDC: { symbol: "USDC", label: "USDC", decimals: 6, mint: USDC_MINT },
};

export const SUPPORTED_CURRENCIES: Currency[] = ["SOL", "USDC"];

export function getPrice(asset: MeshAsset, currency: Currency): number {
  return currency === "SOL" ? asset.priceSol : asset.priceUsdc;
}

export function formatPrice(asset: MeshAsset, currency: Currency): string {
  const value = getPrice(asset, currency);
  return `${value} ${TOKENS[currency].label}`;
}
