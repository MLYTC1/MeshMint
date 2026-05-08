import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  chainAssetToMeshAsset,
  resolveAllMetadata,
} from "@/lib/services/marketplace";
import { AssetCard } from "@/components/marketplace/AssetCard";
import type { MeshAsset } from "@/types/mesh";
import { useChainAssets } from "@/hooks/useMarketplace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mesh Mint — The 3D creator economy on Solana" },
      {
        name: "description",
        content:
          "Mint, license, and sell 3D assets on Solana. Built for creators, verified on-chain.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const chain = useChainAssets();
  const [metaVersion, setMetaVersion] = useState(0);

  useEffect(() => {
    if (chain.assets.length === 0) return;
    const assetIds = chain.assets.map((a) => a.assetId);
    resolveAllMetadata(assetIds).then(() => setMetaVersion((n) => n + 1));
  }, [chain.assets]);

  const featured = useMemo<MeshAsset[]>(() => {
    return chain.assets.slice(0, 3).map((a) =>
      chainAssetToMeshAsset({
        address: a.address.toString(),
        creator: a.creator.toString(),
        assetId: a.assetId,
        priceSol: a.priceSol,
        license: a.license,
        createdAtUnix: a.createdAtUnix,
      })
    );
  }, [chain.assets, metaVersion]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Built on Solana · Anchor-powered · Devnet ready
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
              The <span className="text-gradient-mint">3D creator economy</span>{" "}
              on Solana.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              Upload, preview, and mint license NFTs for your 3D assets. Sell
              with SOL or USDC. Ownership and rights verified on-chain.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2 shadow-glow">
                <Link to="/marketplace">
                  Explore marketplace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/upload">Become a creator</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-2 text-muted-foreground">
            From upload to payout in under a minute.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: "01",
              t: "Upload .glb",
              b: "Drop your 3D file. It's stored permanently on IPFS via Pinata.",
            },
            {
              n: "02",
              t: "Mint license NFT",
              b: "Choose Personal, Commercial or Extended. Royalties baked in.",
            },
            {
              n: "03",
              t: "List & price",
              b: "Set your price in SOL or USDC. Go live on the marketplace instantly.",
            },
            {
              n: "04",
              t: "Buyer unlocks",
              b: "Ownership verified on-chain. Buyer downloads the original file from IPFS.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-card transition-colors hover:border-primary/40"
            >
              <div className="font-mono text-3xl font-semibold text-gradient-mint">
                {s.n}
              </div>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Featured assets
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Recent listings from the Mesh Mint marketplace.
              </p>
            </div>
            <Button asChild variant="ghost" className="gap-1">
              <Link to="/marketplace">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-mesh p-10 sm:p-16">
          <div className="absolute inset-0 bg-gradient-hero opacity-60" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Mint your first 3D asset in minutes.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Connect a Solana wallet, upload your .glb, choose a license — Mesh
              Mint handles the rest.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-glow">
                <Link to="/upload">Start creating</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
