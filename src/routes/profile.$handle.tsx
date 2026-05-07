import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAssetsByCreator } from "@/lib/services/marketplace";
import type { MeshAsset } from "@/types/mesh";
import { AssetCard } from "@/components/marketplace/AssetCard";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export const Route = createFileRoute("/profile/$handle")({
  head: ({ params }) => ({
    meta: [{ title: `@${params.handle} — Mesh Mint` }],
  }),
  component: Profile,
});

function Profile() {
  const { handle } = Route.useParams();
  const [assets, setAssets] = useState<MeshAsset[]>([]);

  useEffect(() => {
    listAssetsByCreator(handle).then(setAssets);
  }, [handle]);

  const creator = assets[0]?.creator;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Card className="mb-10 flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 bg-gradient-mint">
          <AvatarFallback className="bg-transparent text-2xl font-semibold text-primary-foreground">
            {handle[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">@{handle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            3D creator on Mesh Mint · Solana-verified
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Badge variant="outline" className="gap-1">
              <Star className="h-3 w-3 text-primary" />
              {creator?.reputation ?? 0} rep
            </Badge>
            <Badge variant="outline">{assets.length} listings</Badge>
            <Badge variant="outline">Verified creator</Badge>
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
          No published assets yet.
        </div>
      )}
    </div>
  );
}
