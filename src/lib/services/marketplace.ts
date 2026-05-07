import type { MeshAsset } from "@/types/mesh";

/**
 * Mock marketplace data service.
 * Swap each function with a real API/RPC call when your backend or Anchor
 * program is ready — the function shapes are stable.
 */

const SAMPLE_MODELS = [
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
  "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb",
];

const ASSETS: MeshAsset[] = [
  {
    id: "astro-01",
    title: "Orbital Astronaut",
    description:
      "High-fidelity rigged astronaut, optimized for cinematic renders and game engines. PBR textures, 4K maps included.",
    creator: { wallet: "8xv...K2j", handle: "nebulaforge", reputation: 982 },
    modelUrl: SAMPLE_MODELS[0],
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
    id: "helmet-01",
    title: "Damaged Combat Helmet",
    description:
      "Battle-worn helmet asset with detailed normal and roughness maps. Ready for AAA pipelines.",
    creator: { wallet: "Hk3...9Lp", handle: "ironworks", reputation: 1244 },
    modelUrl: SAMPLE_MODELS[1],
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
    id: "robot-01",
    title: "Expressive Companion Bot",
    description:
      "Stylized robot with full animation set. Perfect for indie games and motion design.",
    creator: { wallet: "2Ap...Mn7", handle: "polyloop", reputation: 671 },
    modelUrl: SAMPLE_MODELS[2],
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
    id: "avocado-01",
    title: "Studio Avocado",
    description:
      "Photoreal product shot avocado. Studio-grade textures, perfect for ads and renders.",
    creator: { wallet: "Qz4...R1x", handle: "studiograin", reputation: 540 },
    modelUrl: SAMPLE_MODELS[3],
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
    id: "duck-01",
    title: "Vintage Rubber Duck",
    description:
      "Classic glTF reference duck — clean topology, beginner-friendly license.",
    creator: { wallet: "7Yu...B8c", handle: "polyloop", reputation: 671 },
    modelUrl: SAMPLE_MODELS[4],
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
    id: "boombox-01",
    title: "Retro Boombox",
    description:
      "Detailed 80s boombox with PBR materials. Includes separable mesh parts.",
    creator: { wallet: "Mn2...V4q", handle: "ironworks", reputation: 1244 },
    modelUrl: SAMPLE_MODELS[5],
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

// --- live store ---------------------------------------------------------
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function subscribeAssets(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function addAsset(asset: MeshAsset): void {
  ASSETS.unshift(asset);
  emit();
}

export async function listAssets(): Promise<MeshAsset[]> {
  return [...ASSETS];
}

export async function getAsset(id: string): Promise<MeshAsset | undefined> {
  return ASSETS.find((a) => a.id === id);
}

export async function listAssetsByCreator(
  handle: string
): Promise<MeshAsset[]> {
  return ASSETS.filter(
    (a) => a.creator.handle === handle || a.creator.wallet === handle
  );
}

export function getAllTags(): string[] {
  return Array.from(new Set(ASSETS.flatMap((a) => a.tags))).sort();
}
