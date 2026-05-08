/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MESH_MINT_PROGRAM_ID?: string;
  readonly VITE_SOLANA_CLUSTER?: string;
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_TREASURY_WALLET?: string;
  readonly VITE_USDC_MINT?: string;
  readonly VITE_ASSET_STORAGE_ENDPOINT?: string;
  readonly VITE_PLATFORM_FEE_BPS?: string;
  readonly VITE_PINATA_JWT?: string;
  readonly VITE_PINATA_GATEWAY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
