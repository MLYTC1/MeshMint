import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  chainAssetToMeshAsset,
  resolveAllMetadata,
} from "@/lib/services/marketplace";
import type { MeshAsset } from "@/types/mesh";
import { AssetCard } from "@/components/marketplace/AssetCard";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useChainAssets } from "@/hooks/useMarketplace";

export const Route = createFileRoute("/profile/$handle")({
  head: ({ params }) => ({
    meta: [{ title: `${params.handle} — Mesh Mint` }],
  }),
  component: Profile,
});

function shortWallet(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function Profile() {
  const { handle } = Route.useParams();
  const chain = useChainAssets();
  const [metaVersion, setMetaVersion] = useState(0);

  useEffect(() => {
    if (chain.assets.length === 0) return;
    const assetIds = chain.assets.map((a) => a.assetId);
    resolveAllMetadata(assetIds).then(() => setMetaVersion((n) => n + 1));
  }, [chain.assets]);

  // Match by full wallet address or by short wallet handle
  const assets = useMemo<MeshAsset[]>(() => {
    return chain.assets
      .filter((a) => {
        const wallet = a.creator.toString();
        return wallet === handle || shortWallet(wallet) === handle;
      })
      .map((a) =>
        chainAssetToMeshAsset({
          address: a.address.toString(),
          creator: a.creator.toString(),
          assetId: a.assetId,
          priceSol: a.priceSol,
          license: a.license,
          createdAtUnix: a.createdAtUnix,
        })
      );
  }, [chain.assets, handle, metaVersion]);

  const displayHandle = handle.length > 12 ? shortWallet(handle) : handle;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Card className="mb-10 flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 bg-gradient-mint">
          <AvatarFallback className="bg-transparent text-2xl font-semibold text-primary-foreground">
            {displayHandle[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {displayHandle}
          </h1>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {handle}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            On-chain creator on Mesh Mint · Solana-verified
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Badge variant="outline" className="gap-1">
              <Star className="h-3 w-3 text-primary" />
              On-chain verified
            </Badge>
            <Badge variant="outline">{assets.length} listings</Badge>
          </div>
        </div>
      </Card>

      <h2 className="mb-4 text-xl font-semibold">Published assets</h2>
      {assets.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
          {chain.isLoading ? "Loading assets…" : "No published assets yet."}
        </div>
      )}
    </div>
  );
}
