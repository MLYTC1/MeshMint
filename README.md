# MeshMint

Decentralized 3D asset marketplace built with React + Vite, Anchor, and Pinata/IPFS.

## Getting Started

```shell
npx -y create-solana-dapp@latest -t solana-foundation/templates/kit/mint
```

```shell
npm install   # Builds program and generates client automatically
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), connect your wallet, and interact with the marketplace on devnet.

## What's Included

- **Wallet connection** via `@solana/react-hooks` with auto-discovery
- **On-chain marketplace program** - create listings, purchase licenses, verify ownership, and close listings
- **Pinata/IPFS persistence** - 3D model files and metadata are stored off-chain on IPFS
- **Codama-generated client** - type-safe Anchor program interactions using `@solana/kit`
- **Tailwind CSS v4** with light/dark mode

## Stack

| Layer          | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Frontend       | React 19, Vite, TypeScript                               |
| Styling        | Tailwind CSS v4                                          |
| Solana Client  | `@solana/client`, `@solana/react-hooks`                  |
| Program Client | Codama-generated, `@solana/kit`                          |
| Program        | Anchor (Rust)                                            |
| Storage        | Pinata IPFS API + configurable public gateways (`VITE_*`) |

## Project Structure

```
├── src/
│   ├── routes/                    # Marketplace pages (home, asset, upload, dashboard)
│   ├── hooks/useMarketplace.ts    # On-chain asset and purchase hooks
│   ├── lib/services/marketplace.ts# IPFS metadata resolution + mapping
│   ├── lib/pinata.ts              # Pinata upload and gateway helpers
│   ├── lib/solana/assetPda.ts     # SHA-256-based Asset PDA derivation
│   ├── generated/marketplace/     # Codama-generated program client
│   └── main.tsx                   # Entry point
├── anchor/                        # Anchor workspace
│   └── programs/marketplace/      # Marketplace program (Rust)
└── codama.json                    # Codama client generation config
```

## Deploy Your Own Program

The included marketplace program is already deployed to devnet. To deploy your own:

### Prerequisites

- [Rust](https://rustup.rs/)
- [Solana CLI](https://solana.com/docs/intro/installation)
- [Anchor](https://www.anchor-lang.com/docs/installation)

### Steps

1. **Configure Solana CLI for devnet**

   ```bash
   solana config set --url devnet
   ```

2. **Create a wallet (if needed) and fund it**

   ```bash
   solana-keygen new
   solana airdrop 2
   ```

3. **Build and deploy the program**

   ```bash
   cd anchor
   anchor build
   anchor keys sync    # Updates program ID in source
   anchor build        # Rebuild with new ID
   anchor deploy
   cd ..
   ```

4. **Regenerate the client and restart**
   ```bash
   npm run setup   # Rebuilds program and regenerates client
   npm run dev
   ```

## Architecture Notes

- **Anchor stores:** asset listings, creator, pricing, license type, purchase/license proofs, and marketplace state.
- **Pinata/IPFS stores:** `.glb` / `.gltf` model files and metadata JSON pointers referenced by on-chain `asset_id`.
- **Frontend role:** wallet interaction, Pinata uploads, Anchor instruction calls, and rendering chain/IPFS data.
- **No frontend persistence:** marketplace data and ownership come from Solana accounts and IPFS only.
- **Seed safety:** Asset PDA derivation hashes `asset_id` with SHA-256 to satisfy Solana's 32-byte seed limit.

## Testing

Tests use [LiteSVM](https://github.com/LiteSVM/litesvm), a fast lightweight Solana VM for testing.

```bash
npm run anchor-build   # Build the program first
npm run anchor-test    # Run tests
```

The tests are in `anchor/programs/marketplace/src/tests.rs` and automatically use the program ID from `declare_id!`.

## Regenerating the Client

If you modify the program, regenerate the TypeScript client:

```bash
npm run setup   # Or: npm run anchor-build && npm run codama:js
```

This uses [Codama](https://github.com/codama-idl/codama) to generate a type-safe client from the Anchor IDL.

## Environment

Create your local environment file:

```bash
cp .env.example .env
```

Required variables:

- `VITE_PINATA_JWT` - Pinata JWT used by upload helpers
- `VITE_PINATA_GATEWAY` - preferred IPFS gateway hostname/base URL

## Learn More

- [Solana Docs](https://solana.com/docs) - core concepts and guides
- [Anchor Docs](https://www.anchor-lang.com/docs) - program development framework
- [Deploying Programs](https://solana.com/docs/programs/deploying) - deployment guide
- [framework-kit](https://github.com/solana-foundation/framework-kit) - the React hooks used here
- [Codama](https://github.com/codama-idl/codama) - client generation from IDL
- [Pinata Docs](https://docs.pinata.cloud/) - uploading files and gateway access
