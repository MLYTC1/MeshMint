import { LicenseType } from "@/generated/marketplace";

/** Anchor `global:create_asset` discriminator (sha256 first 8 bytes). */
const CREATE_ASSET_DISCRIMINATOR = Uint8Array.from([
  28, 42, 120, 51, 7, 38, 156, 136,
]);

function writeU32Le(dst: Uint8Array, offset: number, value: number): void {
  dst[offset] = value & 0xff;
  dst[offset + 1] = (value >>> 8) & 0xff;
  dst[offset + 2] = (value >>> 16) & 0xff;
  dst[offset + 3] = (value >>> 24) & 0xff;
}

function writeU64Le(dst: Uint8Array, offset: number, value: bigint): void {
  let n = value;
  for (let i = 0; i < 8; i += 1) {
    dst[offset + i] = Number(n & 0xffn);
    n >>= 8n;
  }
}

/**
 * Borsh layout for Anchor `create_asset` args (matches
 * `anchor/programs/marketplace/src/tests.rs` and Codama codec).
 *
 * discriminator (8) + borsh(string) + u64 LE + enum u8
 */
export function encodeCreateAssetInstructionData(payload: Readonly<{
  assetId: string;
  priceLamports: bigint;
  licenseType: LicenseType;
}>): Uint8Array {
  const idBytes = new TextEncoder().encode(payload.assetId);
  const idLen = idBytes.length;
  const total = 8 + 4 + idLen + 8 + 1;
  const out = new Uint8Array(total);
  let o = 0;
  out.set(CREATE_ASSET_DISCRIMINATOR, o);
  o += 8;
  writeU32Le(out, o, idLen);
  o += 4;
  out.set(idBytes, o);
  o += idLen;
  writeU64Le(out, o, payload.priceLamports);
  o += 8;
  const tag = payload.licenseType as number;
  if (!Number.isInteger(tag) || tag < 0 || tag > 2) {
    throw new Error("Invalid license type for on-chain enum");
  }
  out[o] = tag;
  return out;
}
