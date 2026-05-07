import type { MeshAsset } from "@/types/mesh";

/**
 * Marketplace data service.
 *
 * - The on-chain `Asset` account stores: creator, asset_id (pointer), price,
 *   license, created_at, bump. It does NOT store binary 3D content.
 * - This module owns the **off-chain metadata cache** (title, description,
 *   modelUrl, …) keyed by `asset_id`, and the **demo asset fallback** so the
 *   UI keeps working when the chain has nothing to show yet.
 *
 * Real chain reads happen in `@/hooks/useMarketplace` via `useChainAssets()`.
 * UI components merge the two: chain assets first, demo as fallback.
 */

const DEFAULT_MODEL_POOL = [
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
  "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb",
];

/** Pseudo-deterministic preview model for an unknown chain asset. */
export function getDefaultModelUrl(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1)
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % DEFAULT_MODEL_POOL.length;
  return DEFAULT_MODEL_POOL[idx];
}

const DEMO_ASSETS: MeshAsset[] = [
  {
    id: "demo-astro-01",
    title: "Orbital Astronaut",
    description:
      "High-fidelity rigged astronaut, optimized for cinematic renders and game engines. PBR textures, 4K maps included.",
    creator: { wallet: "8xv...K2j", handle: "nebulaforge", reputation: 982 },
    modelUrl: DEFAULT_MODEL_POOL[0],
    priceSol: 2.4,
    priceUsdc: 320,
    currency: "SOL",
    license: "commercial",
    tags: ["character", "scifi", "rigged"],
    polygons: 48200,
    fileSizeMb: 18.4,
    createdAt: "2025-03-12",
  },
  {
    id: "demo-helmet-01",
    title: "Damaged Combat Helmet",
    description:
      "Battle-worn helmet asset with detailed normal and roughness maps. Ready for AAA pipelines.",
    creator: { wallet: "Hk3...9Lp", handle: "ironworks", reputation: 1244 },
    modelUrl: DEFAULT_MODEL_POOL[1],
    priceSol: 1.2,
    priceUsdc: 160,
    currency: "SOL",
    license: "extended",
    tags: ["prop", "scifi", "pbr"],
    polygons: 15400,
    fileSizeMb: 6.2,
    createdAt: "2025-04-02",
  },
  {
    id: "demo-robot-01",
    title: "Expressive Companion Bot",
    description:
      "Stylized robot with full animation set. Perfect for indie games and motion design.",
    creator: { wallet: "2Ap...Mn7", handle: "polyloop", reputation: 671 },
    modelUrl: DEFAULT_MODEL_POOL[2],
    priceSol: 0.8,
    priceUsdc: 110,
    currency: "USDC",
    license: "personal",
    tags: ["character", "stylized", "animated"],
    polygons: 22100,
    fileSizeMb: 9.1,
    createdAt: "2025-04-18",
  },
  {
    id: "demo-avocado-01",
    title: "Studio Avocado",
    description:
      "Photoreal product shot avocado. Studio-grade textures, perfect for ads and renders.",
    creator: { wallet: "Qz4...R1x", handle: "studiograin", reputation: 540 },
    modelUrl: DEFAULT_MODEL_POOL[3],
    priceSol: 0.3,
    priceUsdc: 40,
    currency: "USDC",
    license: "commercial",
    tags: ["product", "food", "pbr"],
    polygons: 4200,
    fileSizeMb: 1.8,
    createdAt: "2025-05-01",
  },
  {
    id: "demo-duck-01",
    title: "Vintage Rubber Duck",
    description:
      "Classic glTF reference duck — clean topology, beginner-friendly license.",
    creator: { wallet: "7Yu...B8c", handle: "polyloop", reputation: 671 },
    modelUrl: DEFAULT_MODEL_POOL[4],
    priceSol: 0.15,
    priceUsdc: 20,
    currency: "USDC",
    license: "personal",
    tags: ["prop", "stylized"],
    polygons: 2100,
    fileSizeMb: 0.9,
    createdAt: "2025-02-20",
  },
  {
    id: "demo-boombox-01",
    title: "Retro Boombox",
    description:
      "Detailed 80s boombox with PBR materials. Includes separable mesh parts.",
    creator: { wallet: "Mn2...V4q", handle: "ironworks", reputation: 1244 },
    modelUrl: DEFAULT_MODEL_POOL[5],
    priceSol: 0.65,
    priceUsdc: 85,
    currency: "SOL",
    license: "commercial",
    tags: ["prop", "retro", "pbr"],
    polygons: 9800,
    fileSizeMb: 3.4,
    createdAt: "2025-03-28",
  },
];

// --- Off-chain metadata cache ------------------------------------------------
//
// When a creator mints an asset on chain, the on-chain account only carries
// the small `asset_id` pointer. The rich metadata (title, description, the
// 3D model URL itself) lives off chain. For this hackathon-grade build we
// keep that metadata in an in-memory map keyed by asset_id; in production
// you'd resolve the asset_id to an IPFS/HTTP JSON document instead.

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
};

const metadataByAssetId = new Map<string, MetadataPatch>();
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

/** Save off-chain metadata for a freshly-minted asset (in-memory). */
export function setAssetMetadata(assetId: string, patch: MetadataPatch): void {
  metadataByAssetId.set(assetId, patch);
  emit();
}

export function getAssetMetadata(assetId: string): MetadataPatch | undefined {
  return metadataByAssetId.get(assetId);
}

// --- Demo fallback API -------------------------------------------------------

export async function listDemoAssets(): Promise<MeshAsset[]> {
  return [...DEMO_ASSETS];
}

export async function getDemoAsset(id: string): Promise<MeshAsset | undefined> {
  return DEMO_ASSETS.find((a) => a.id === id);
}

export async function listDemoAssetsByCreator(
  handle: string
): Promise<MeshAsset[]> {
  return DEMO_ASSETS.filter(
    (a) => a.creator.handle === handle || a.creator.wallet === handle
  );
}

export function getAllDemoTags(): string[] {
  return Array.from(new Set(DEMO_ASSETS.flatMap((a) => a.tags))).sort();
}

// --- Chain → UI conversion ---------------------------------------------------

export type MinimalChainAsset = Readonly<{
  /** PDA address — used as the canonical UI id. */
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
 * Project an on-chain asset (small) onto a full `MeshAsset` (UI-rich) by
 * merging in any locally cached metadata, falling back to deterministic
 * defaults. Never throws — missing fields are filled with sensible defaults
 * so the render tree can never crash.
 */
export function chainAssetToMeshAsset(chain: MinimalChainAsset): MeshAsset {
  const meta = metadataByAssetId.get(chain.assetId);
  const wallet = chain.creator;
  const creatorHandle = meta?.modelUrl
    ? shortWallet(wallet)
    : shortWallet(wallet);
  return {
    id: chain.address,
    title: meta?.title ?? `Asset ${chain.assetId.slice(0, 12)}`,
    description:
      meta?.description ?? "On-chain Mesh Mint listing. Metadata pending.",
    creator: {
      wallet,
      handle: creatorHandle,
      reputation: 0,
    },
    modelUrl: meta?.modelUrl ?? getDefaultModelUrl(chain.assetId),
    coverUrl: meta?.coverUrl,
    priceSol: chain.priceSol,
    priceUsdc: meta?.priceUsdc ?? Math.round(chain.priceSol * 130),
    currency: meta?.currency ?? "SOL",
    license: chain.license,
    tags: meta?.tags ?? ["on-chain", chain.license],
    polygons: meta?.polygons,
    fileSizeMb: meta?.fileSizeMb,
    createdAt: chain.createdAtUnix
      ? new Date(chain.createdAtUnix * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    mintAddress: chain.address,
  };
}

// --- Backwards-compatible names for existing routes --------------------------

export const listAssets = listDemoAssets;
export const getAsset = getDemoAsset;
export const getAllTags = getAllDemoTags;
export const listAssetsByCreator = listDemoAssetsByCreator;

/**
 * @deprecated Mint flow now refetches real chain data instead of optimistic
 * insertion. Use {@link setAssetMetadata} to save off-chain metadata.
 */
export function addAsset(_asset: MeshAsset): void {
  // intentional no-op — kept so older imports don't break during migration.
}
