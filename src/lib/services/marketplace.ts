import type { MeshAsset } from "@/types/mesh";
import {
  fetchMetadataJson,
  resolveGatewayUrl,
  type AssetMetadataJson,
} from "@/lib/pinata";

/**
 * Marketplace data service.
 *
 * - The on-chain `Asset` account stores: creator, asset_id (IPFS CID pointer),
 *   price, license, created_at, bump. Binary 3D content is NEVER on chain.
 * - This module owns the **off-chain metadata cache** — it resolves the
 *   `asset_id` CID to a Pinata-hosted JSON document that contains the model
 *   CID, title, description, tags, etc.
 * - No demo/mock data. All marketplace content is real on-chain + Pinata data.
 */

// --- Metadata cache ----------------------------------------------------------

type MetadataPatch = Pick<
  MeshAsset,
  | "title"
  | "description"
  | "modelUrl"
  | "currency"
  | "tags"
  | "polygons"
  | "fileSizeMb"
> & {
  priceUsdc?: number;
  coverUrl?: string;
  /** Raw model CID — only exposed for download after license verification. */
  modelCid?: string;
};

const metadataByAssetId = new Map<string, MetadataPatch>();
const pendingFetches = new Map<string, Promise<MetadataPatch | null>>();
const failedFetches = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const cb of listeners) cb();
}

export function subscribeAssets(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Save off-chain metadata for a freshly-minted asset (optimistic). */
export function setAssetMetadata(assetId: string, patch: MetadataPatch): void {
  metadataByAssetId.set(assetId, patch);
  failedFetches.delete(assetId);
  emit();
}

export function getAssetMetadata(assetId: string): MetadataPatch | undefined {
  return metadataByAssetId.get(assetId);
}

/**
 * Get the model CID for an asset. Only call this after verifying the caller
 * holds a valid on-chain license (Purchase PDA). The CID can then be resolved
 * to a gateway download URL.
 */
export function getModelCid(assetId: string): string | undefined {
  return metadataByAssetId.get(assetId)?.modelCid;
}

/** Check if metadata fetch previously failed for this asset. */
export function isMetadataFailed(assetId: string): boolean {
  return failedFetches.has(assetId);
}

/**
 * Resolve metadata for an asset_id. Checks in-memory cache first, then
 * fetches from Pinata gateway if the asset_id looks like a CID.
 * Returns null if resolution fails. Failed fetches are tracked so the UI
 * can show an error state instead of infinite loading.
 */
export async function resolveAssetMetadata(
  assetId: string
): Promise<MetadataPatch | null> {
  const cached = metadataByAssetId.get(assetId);
  if (cached) return cached;

  if (failedFetches.has(assetId)) return null;

  const existing = pendingFetches.get(assetId);
  if (existing) return existing;

  const isCidLike = /^(Qm[a-zA-Z0-9]{44}|bafy[a-z0-9]{50,})$/.test(assetId);
  if (!isCidLike) return null;

  const promise = (async (): Promise<MetadataPatch | null> => {
    try {
      const json = await fetchMetadataJson(assetId);
      const patch = pinataJsonToPatch(json);
      metadataByAssetId.set(assetId, patch);
      emit();
      return patch;
    } catch (err) {
      console.warn(
        `[marketplace] failed to resolve metadata for ${assetId}`,
        err
      );
      failedFetches.add(assetId);
      emit();
      return null;
    } finally {
      pendingFetches.delete(assetId);
    }
  })();

  pendingFetches.set(assetId, promise);
  return promise;
}

function pinataJsonToPatch(json: AssetMetadataJson): MetadataPatch {
  return {
    title: json.title,
    description: json.description,
    modelUrl: resolveGatewayUrl(json.modelCid),
    modelCid: json.modelCid,
    currency: (json.currency as "SOL" | "USDC") || "SOL",
    tags: json.tags ?? [],
    polygons: json.polygons,
    fileSizeMb: json.fileSizeMb,
    priceUsdc: json.priceUsdc,
  };
}

// --- Tags from cached metadata -----------------------------------------------

export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const meta of metadataByAssetId.values()) {
    for (const t of meta.tags) tags.add(t);
  }
  return Array.from(tags).sort();
}

// --- Chain → UI conversion ---------------------------------------------------

export type MinimalChainAsset = Readonly<{
  address: string;
  creator: string;
  assetId: string;
  priceSol: number;
  license: MeshAsset["license"];
  createdAtUnix?: number;
}>;

function shortWallet(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/**
 * Project an on-chain asset onto a full `MeshAsset` by merging in any
 * locally cached metadata. Falls back to placeholder values if metadata
 * hasn't been fetched yet.
 */
export function chainAssetToMeshAsset(chain: MinimalChainAsset): MeshAsset {
  const meta = metadataByAssetId.get(chain.assetId);
  const failed = failedFetches.has(chain.assetId);
  const wallet = chain.creator;
  return {
    id: chain.address,
    title: meta?.title ?? `Asset ${chain.assetId.slice(0, 12)}…`,
    description:
      meta?.description ??
      (failed
        ? "Metadata unavailable — IPFS gateway did not respond."
        : "On-chain listing. Loading metadata from IPFS…"),
    creator: {
      wallet,
      handle: shortWallet(wallet),
      reputation: 0,
    },
    modelUrl: meta?.modelUrl ?? "",
    coverUrl: meta?.coverUrl,
    priceSol: chain.priceSol,
    priceUsdc: meta?.priceUsdc ?? Math.round(chain.priceSol * 130),
    currency: meta?.currency ?? "SOL",
    license: chain.license,
    tags: meta?.tags ?? [chain.license],
    polygons: meta?.polygons,
    fileSizeMb: meta?.fileSizeMb,
    createdAt: chain.createdAtUnix
      ? new Date(chain.createdAtUnix * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    mintAddress: chain.address,
  };
}

/**
 * Batch-resolve metadata for a list of chain assets in parallel.
 * Uses Promise.allSettled to avoid waterfall fetches.
 */
export async function resolveAllMetadata(assetIds: string[]): Promise<void> {
  const uncached = assetIds.filter(
    (id) => !metadataByAssetId.has(id) && !failedFetches.has(id)
  );
  if (uncached.length === 0) return;
  await Promise.allSettled(uncached.map((id) => resolveAssetMetadata(id)));
}
