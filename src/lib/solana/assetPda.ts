import {
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  type Address,
  type ProgramDerivedAddress,
} from "@solana/kit";
import { MARKETPLACE_PROGRAM_ADDRESS } from "@/generated/marketplace";

/**
 * Derive the Asset PDA. The on-chain program hashes the asset_id with SHA-256
 * before using it as a seed (because IPFS CIDs can exceed the 32-byte Solana
 * PDA seed limit). This helper mirrors that logic.
 */
export async function findAssetPda(
  seeds: { creator: Address; assetId: string },
  config: { programAddress?: Address } = {}
): Promise<ProgramDerivedAddress> {
  const { programAddress = MARKETPLACE_PROGRAM_ADDRESS } = config;

  const assetIdBytes = new TextEncoder().encode(seeds.assetId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", assetIdBytes);
  const assetIdHash = new Uint8Array(hashBuffer);

  return getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([97, 115, 115, 101, 116]) // "asset"
      ),
      getAddressEncoder().encode(seeds.creator),
      getBytesEncoder().encode(assetIdHash),
    ],
  });
}
