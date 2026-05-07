import { Program, type Idl } from "@coral-xyz/anchor";
import type { AnchorProvider } from "@coral-xyz/anchor";
import { meshMintIdl } from "@/programs/meshMintIdl";

/**
 * Returns an Anchor Program instance for the Mesh Mint program.
 * Anchor 0.30+ reads the program address from the IDL itself, so make sure
 * `meshMintIdl.address` matches your deployed program ID (or VITE_MESH_MINT_PROGRAM_ID).
 */
export function getMeshMintProgram(provider: AnchorProvider): Program<Idl> {
  return new Program(meshMintIdl as unknown as Idl, provider);
}
