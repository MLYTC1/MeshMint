import { useCallback, useMemo } from "react";
import {
  useSendTransaction,
  useWalletSession,
  useProgramAccounts,
} from "@solana/react-hooks";
import { createWalletTransactionSigner } from "@solana/client";
import {
  address,
  getBase58Decoder,
  type Address,
  type Base58EncodedBytes,
  type Signature,
} from "@solana/kit";
import {
  getCreateAssetInstruction,
  getPurchaseAssetInstructionAsync,
  getCloseAssetInstruction,
  ASSET_DISCRIMINATOR,
  getAssetDecoder,
  LicenseType,
  MARKETPLACE_PROGRAM_ADDRESS,
  type Asset,
} from "@/generated/marketplace";
import { findAssetPda } from "@/lib/solana/assetPda";
import type { LicenseType as UiLicenseType } from "@/types/mesh";

/** Lamports per SOL — Solana's native unit conversion. */
export const LAMPORTS_PER_SOL = 1_000_000_000n;

/**
 * Convert a UI license string ("personal" | "commercial" | "extended") to the
 * on-chain enum understood by the Anchor program / Codama client.
 */
export function uiLicenseToEnum(license: UiLicenseType): LicenseType {
  switch (license) {
    case "personal":
      return LicenseType.Personal;
    case "commercial":
      return LicenseType.Commercial;
    case "extended":
      return LicenseType.Extended;
  }
}

/**
 * Convert the on-chain enum back to the UI string. Returns "personal" for
 * unknown values so the UI can never crash on a bad enum.
 */
export function enumLicenseToUi(license: LicenseType): UiLicenseType {
  switch (license) {
    case LicenseType.Commercial:
      return "commercial";
    case LicenseType.Extended:
      return "extended";
    case LicenseType.Personal:
    default:
      return "personal";
  }
}

/** Convert a SOL number to lamports as a bigint, clamped to >= 0. */
export function solToLamports(sol: number): bigint {
  if (!Number.isFinite(sol) || sol <= 0) return 0n;
  return BigInt(Math.round(sol * Number(LAMPORTS_PER_SOL)));
}

/** Convert lamports to a SOL number. */
export function lamportsToSol(lamports: bigint | number): number {
  const value = typeof lamports === "bigint" ? lamports : BigInt(lamports);
  return Number(value) / Number(LAMPORTS_PER_SOL);
}

/**
 * Hook returning typed marketplace actions wired to the connected wallet.
 * Uses the Codama-generated instruction builders with a custom PDA derivation
 * (SHA-256 hash of asset_id) to match the on-chain program.
 *
 * Returns `null` when no wallet is connected — never throws.
 */
export function useMarketplaceActions() {
  const session = useWalletSession();
  const { send } = useSendTransaction();

  const signer = useMemo(
    () => (session ? createWalletTransactionSigner(session).signer : null),
    [session]
  );

  const createAsset = useCallback(
    async (input: {
      assetId: string;
      priceSol: number;
      license: UiLicenseType;
    }): Promise<Signature> => {
      if (!signer) throw new Error("Wallet is not connected");
      const creator = address(session!.account.address.toString());
      const [assetPda] = await findAssetPda({
        creator,
        assetId: input.assetId,
      });
      const ix = getCreateAssetInstruction({
        creator: signer,
        asset: assetPda,
        assetId: input.assetId,
        price: solToLamports(input.priceSol),
        licenseType: uiLicenseToEnum(input.license),
      });
      return send({ instructions: [ix], authority: signer });
    },
    [send, session, signer]
  );

  const purchaseAsset = useCallback(
    async (input: { assetId: string; creator: string }): Promise<Signature> => {
      if (!signer) throw new Error("Wallet is not connected");
      const creator = address(input.creator);
      const [assetPda] = await findAssetPda({
        creator,
        assetId: input.assetId,
      });
      const ix = await getPurchaseAssetInstructionAsync({
        buyer: signer,
        creator,
        asset: assetPda,
      });
      return send({ instructions: [ix], authority: signer });
    },
    [send, signer]
  );

  const closeAsset = useCallback(
    async (input: { assetId: string }): Promise<Signature> => {
      if (!signer) throw new Error("Wallet is not connected");
      const creator = address(session!.account.address.toString());
      const [assetPda] = await findAssetPda({
        creator,
        assetId: input.assetId,
      });
      const ix = getCloseAssetInstruction({ creator: signer, asset: assetPda });
      return send({ instructions: [ix], authority: signer });
    },
    [send, session, signer]
  );

  return useMemo(() => {
    if (!session || !signer) return null;
    return {
      walletAddress: session.account.address.toString(),
      createAsset,
      purchaseAsset,
      closeAsset,
    };
  }, [closeAsset, createAsset, purchaseAsset, session, signer]);
}

// --------------------------------------------------------------------------
// Reading on-chain marketplace listings
// --------------------------------------------------------------------------

const ASSET_DISCRIMINATOR_BASE58 = getBase58Decoder().decode(
  Uint8Array.from(ASSET_DISCRIMINATOR)
) as Base58EncodedBytes;

export type ChainAsset = Readonly<{
  /** PDA address of the on-chain Asset account. */
  address: Address;
  creator: Address;
  /** Off-chain pointer (IPFS CID). */
  assetId: string;
  /** Price in lamports. */
  priceLamports: bigint;
  /** Price in SOL (number). */
  priceSol: number;
  license: UiLicenseType;
  createdAtUnix: number;
}>;

/**
 * Fetch all on-chain Asset accounts for the marketplace program, decoded via
 * the Codama-generated decoder. Filters by the Anchor account discriminator
 * to keep RPC payloads small.
 */
export function useChainAssets() {
  const query = useProgramAccounts(MARKETPLACE_PROGRAM_ADDRESS, {
    config: {
      encoding: "base64",
      filters: [
        {
          memcmp: {
            offset: 0n,
            bytes: ASSET_DISCRIMINATOR_BASE58,
            encoding: "base58",
          },
        },
      ],
    },
  });

  const assets = useMemo<ChainAsset[]>(() => {
    const list = query.accounts;
    if (!Array.isArray(list)) return [];
    const decoder = getAssetDecoder();
    const decoded: ChainAsset[] = [];
    for (const entry of list) {
      try {
        const data = entry.account.data;
        const base64 = Array.isArray(data) ? data[0] : (data as string);
        if (typeof base64 !== "string") continue;
        const bytes = base64ToBytes(base64);
        const decodedAsset = decoder.decode(bytes) as Asset;

        if (!isCidLike(decodedAsset.assetId)) continue;

        decoded.push({
          address: entry.pubkey,
          creator: decodedAsset.creator,
          assetId: decodedAsset.assetId,
          priceLamports: decodedAsset.price,
          priceSol: lamportsToSol(decodedAsset.price),
          license: enumLicenseToUi(decodedAsset.licenseType),
          createdAtUnix: Number(decodedAsset.createdAt),
        });
      } catch (err) {
        console.warn("[useChainAssets] failed to decode asset", err);
      }
    }
    return decoded;
  }, [query.accounts]);

  return {
    assets,
    isLoading: query.isLoading,
    isError: query.isError,
    refresh: query.refresh,
  };
}

function isCidLike(id: string): boolean {
  return /^(Qm[a-zA-Z0-9]{44}|bafy[a-z0-9]{50,})$/.test(id);
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = (globalThis as any).Buffer?.from?.(base64, "base64");
  return buf instanceof Uint8Array ? buf : new Uint8Array();
}
