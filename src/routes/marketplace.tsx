import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getAllTags,
  subscribeAssets,
  chainAssetToMeshAsset,
  resolveAllMetadata,
} from "@/lib/services/marketplace";
import type { MeshAsset, LicenseType } from "@/types/mesh";
import { AssetCard } from "@/components/marketplace/AssetCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useChainAssets } from "@/hooks/useMarketplace";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Mesh Mint" },
      {
        name: "description",
        content: "Browse 3D assets from creators on Solana.",
      },
    ],
  }),
  component: Marketplace,
});

const LICENSES: LicenseType[] = ["personal", "commercial", "extended"];

function Marketplace() {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeLicenses, setActiveLicenses] = useState<LicenseType[]>([]);
  const [metaVersion, setMetaVersion] = useState(0);

  const chain = useChainAssets();

  // Resolve Pinata metadata for all chain assets
  useEffect(() => {
    if (chain.assets.length === 0) return;
    const assetIds = chain.assets.map((a) => a.assetId);
    resolveAllMetadata(assetIds).then(() => setMetaVersion((n) => n + 1));
  }, [chain.assets]);

  // Subscribe to metadata cache updates (from upload flow optimistic writes)
  useEffect(() => {
    return subscribeAssets(() => setMetaVersion((n) => n + 1));
  }, []);

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

  const tags = useMemo(() => {
    const merged = new Set<string>(getAllTags());
    for (const a of assets) for (const t of a.tags) merged.add(t);
    return Array.from(merged).sort();
  }, [assets]);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (
        query &&
        !`${a.title} ${a.description} ${a.creator.handle}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      if (activeTags.length && !activeTags.some((t) => a.tags.includes(t)))
        return false;
      if (activeLicenses.length && !activeLicenses.includes(a.license))
        return false;
      return true;
    });
  }, [assets, query, activeTags, activeLicenses]);

  const toggle = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const totalCount = filtered.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight">Marketplace</h1>
        <p className="mt-2 text-muted-foreground">
          {chain.isLoading ? (
            <span>Loading on-chain listings…</span>
          ) : totalCount > 0 ? (
            <span>
              {totalCount} asset{totalCount !== 1 ? "s" : ""} live on-chain
            </span>
          ) : (
            <span>
              No listings yet — connect a wallet and mint to publish on-chain
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Astronaut, robot…"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
              License
            </h3>
            <div className="flex flex-wrap gap-2">
              {LICENSES.map((l) => (
                <Badge
                  key={l}
                  onClick={() => setActiveLicenses((p) => toggle(p, l))}
                  variant={activeLicenses.includes(l) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                >
                  {l}
                </Badge>
              ))}
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Badge
                    key={t}
                    onClick={() => setActiveTags((p) => toggle(p, t))}
                    variant={activeTags.includes(t) ? "default" : "outline"}
                    className="cursor-pointer"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
          {!chain.isLoading && !filtered.length && (
            <div className="col-span-full rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
              {assets.length === 0
                ? "No assets minted yet. Be the first creator!"
                : "No assets match your filters."}
            </div>
          )}
          {chain.isLoading && (
            <div className="col-span-full rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
              Loading on-chain data…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
