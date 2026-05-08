import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MeshAsset } from "@/types/mesh";
import { Coins, AlertTriangle, Loader2 } from "lucide-react";
import { ModelViewer } from "@/components/solana/ModelViewer";
import { formatPrice } from "@/lib/pricing";

export function AssetCard({ asset }: { asset: MeshAsset }) {
  const isFailed = asset.description.includes("IPFS gateway did not respond");

  return (
    <Link to="/asset/$id" params={{ id: asset.id }} className="group block">
      <Card className="overflow-hidden border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-glow">
        <div className="relative aspect-square overflow-hidden bg-gradient-mesh">
          {asset.modelUrl ? (
            <ModelViewer
              url={asset.modelUrl}
              className="h-full w-full"
              compact
              showControls={false}
            />
          ) : isFailed ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Preview unavailable
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}
          <div className="absolute left-3 top-3 z-10">
            <Badge
              variant="secondary"
              className="text-[10px] uppercase tracking-wider"
            >
              {asset.license}
            </Badge>
          </div>
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-medium group-hover:text-primary">
              {asset.title}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            by{" "}
            <span className="text-foreground/80">@{asset.creator.handle}</span>
          </p>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Coins className="h-3.5 w-3.5 text-primary" />
              {formatPrice(asset, asset.currency)}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {asset.tags[0]}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
