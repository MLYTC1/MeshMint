import { MESH_MINT_PROGRAM_ID } from "@/lib/solana/config";

/**
 * Placeholder IDL for the Mesh Mint Anchor program (Anchor 0.30+ format).
 *
 * Replace with the IDL emitted by `anchor build` (target/idl/mesh_mint.json).
 * Keep the `address` field — Anchor 0.30+ reads the program ID from the IDL.
 */
export const meshMintIdl = {
  address: MESH_MINT_PROGRAM_ID,
  metadata: {
    name: "mesh_mint",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Mesh Mint — Solana 3D creator economy program",
  },
  instructions: [],
  accounts: [],
  types: [],
} as const;
