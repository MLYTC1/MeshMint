export type LicenseType = "personal" | "commercial" | "extended";

export type Currency = "SOL" | "USDC";

export interface Creator {
  wallet: string;
  handle: string;
  avatarUrl?: string;
  bio?: string;
  reputation?: number;
}

export interface MeshAsset {
  id: string;
  title: string;
  description: string;
  creator: Creator;
  modelUrl: string; // .glb / .gltf
  coverUrl?: string;
  priceSol: number;
  priceUsdc: number;
  currency: Currency;
  license: LicenseType;
  tags: string[];
  polygons?: number;
  fileSizeMb?: number;
  createdAt: string;
  mintAddress?: string;
}

export interface PurchaseRecord {
  assetId: string;
  buyer: string;
  signature: string;
  license: LicenseType;
  timestamp: number;
}
