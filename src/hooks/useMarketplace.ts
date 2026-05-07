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
  getCreateAssetInstructionAsync,
  getPurchaseAssetInstructionAsync,
  ASSET_DISCRIMINATOR,
  getAssetDecoder,
  findAssetPda,
  LicenseType,
  MARKETPLACE_PROGRAM_ADDRESS,
  type Asset,
} from "@/generated/marketplace";
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
 * Hook returning a typed `createAsset` and `purchaseAsset` action wired to the
 * connected wallet via `useWalletSession`. Uses the Codama-generated
 * instruction builders so accounts (PDAs, system program, treasury) are
 * resolved deterministically.
 *
 * Returns `null` when no wallet is connected — never throws. Callers should
 * branch on `actions === null` and gate the UI accordingly.
 */
export function useMarketplaceActions() {
  const session = useWalletSession();
  const { send } = useSendTransaction();

  // Wrap the wallet session into a TransactionSigner once per session.
  // The Codama instruction builders require a TransactionSigner for the
  // creator/buyer accounts; this is the canonical bridge in @solana/client.
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
      const ix = await getCreateAssetInstructionAsync({
        creator: signer,
        assetId: input.assetId,
        price: solToLamports(input.priceSol),
        licenseType: uiLicenseToEnum(input.license),
      });
      // Use the same signer as `authority` so prepare does not create a second
      // wallet-backed signer for the same address (would throw "Multiple distinct
      // signers were identified for address ...").
      return send({ instructions: [ix], authority: signer });
    },
    [send, signer]
  );

  const purchaseAsset = useCallback(
    async (input: { assetId: string; creator: string }): Promise<Signature> => {
      if (!signer) throw new Error("Wallet is not connected");
      const creator = address(input.creator);
      const [asset] = await findAssetPda({ creator, assetId: input.assetId });
      const ix = await getPurchaseAssetInstructionAsync({
        buyer: signer,
        creator,
        asset,
      });
      return send({ instructions: [ix], authority: signer });
    },
    [send, signer]
  );

  return useMemo(() => {
    if (!session || !signer) return null;
    return {
      walletAddress: session.account.address.toString(),
      createAsset,
      purchaseAsset,
    };
  }, [createAsset, purchaseAsset, session, signer]);
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
  /** Off-chain pointer (IPFS CID, URL, slug). */
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
 *
 * Demo data is *not* included here — callers should merge real chain data
 * with the demo fallback at the UI layer.
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
        // RPC returns [base64Data, "base64"] when encoding=base64
        const base64 = Array.isArray(data) ? data[0] : (data as string);
        if (typeof base64 !== "string") continue;
        const bytes = base64ToBytes(base64);
        const decodedAsset = decoder.decode(bytes) as Asset;
        decoded.push({
          address: entry.pubkey,
          creator: decodedAsset.creator,
          assetId: decodedAsset.assetId,
          priceLamports: decodedAsset.price,
          priceSol: lamportsToSol(decodedAsset.price),
          license: enumLicenseToUi(decodedAsset.licenseType),
          createdAtUnix: 0,
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

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // Node fallback (SSR / tests)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = (globalThis as any).Buffer?.from?.(base64, "base64");
  return buf instanceof Uint8Array ? buf : new Uint8Array();
}
