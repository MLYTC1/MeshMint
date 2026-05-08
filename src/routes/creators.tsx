import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  chainAssetToMeshAsset,
  resolveAllMetadata,
} from "@/lib/services/marketplace";
import type { MeshAsset } from "@/types/mesh";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useChainAssets } from "@/hooks/useMarketplace";

export const Route = createFileRoute("/creators")({
  head: () => ({
    meta: [
      { title: "Creators — Mesh Mint" },
      {
        name: "description",
        content: "Discover 3D artists building on Solana.",
      },
    ],
  }),
  component: CreatorsPage,
});

interface CreatorAgg {
  handle: string;
  wallet: string;
  count: number;
}

function shortWallet(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function CreatorsPage() {
  const chain = useChainAssets();
  const [metaVersion, setMetaVersion] = useState(0);

  useEffect(() => {
    if (chain.assets.length === 0) return;
    const assetIds = chain.assets.map((a) => a.assetId);
    resolveAllMetadata(assetIds).then(() => setMetaVersion((n) => n + 1));
  }, [chain.assets]);

  const assets = useMemo<MeshAsset[]>(() => {
    return chain.assets.map((a) =>
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

  const creators = useMemo<CreatorAgg[]>(() => {
    const map = new Map<string, CreatorAgg>();
    for (const a of assets) {
      const wallet = a.creator.wallet;
      const existing = map.get(wallet);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(wallet, {
          handle: shortWallet(wallet),
          wallet,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [assets]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Discover
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Creators on Mesh Mint
        </h1>
        <p className="mt-2 text-muted-foreground">
          {chain.isLoading
            ? "Loading creators…"
            : creators.length > 0
              ? `${creators.length} creator${creators.length !== 1 ? "s" : ""} with on-chain listings.`
              : "No creators yet. Be the first to mint!"}
        </p>
      </div>

      {creators.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((c) => (
            <Link
              key={c.wallet}
              to="/profile/$handle"
              params={{ handle: c.wallet }}
            >
              <Card className="group h-full p-6 transition-all hover:border-primary/40 hover:shadow-glow">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 bg-gradient-mint">
                    <AvatarFallback className="bg-transparent text-primary-foreground font-semibold">
                      {c.handle.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold group-hover:text-primary">
                      {c.handle}
                    </h3>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {c.wallet}
                    </p>
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                  On-chain creator on the Mesh Mint marketplace.
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                  <Badge variant="outline">{c.count} assets</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        !chain.isLoading && (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
            No creators found. Mint your first asset to appear here!
          </div>
        )
      )}
    </div>
  );
}
