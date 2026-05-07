import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  listAssets,
  getAllTags,
  subscribeAssets,
} from "@/lib/services/marketplace";
import type { MeshAsset, LicenseType } from "@/types/mesh";
import { AssetCard } from "@/components/marketplace/AssetCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

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
  const [assets, setAssets] = useState<MeshAsset[]>([]);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeLicenses, setActiveLicenses] = useState<LicenseType[]>([]);

  useEffect(() => {
    const refresh = () => listAssets().then(setAssets);
    refresh();
    return subscribeAssets(refresh);
  }, []);

  const tags = useMemo(() => getAllTags(), [assets]);

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight">Marketplace</h1>
        <p className="mt-2 text-muted-foreground">
          {filtered.length} assets · curated by the Mesh Mint community
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
        </aside>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
          {!filtered.length && (
            <div className="col-span-full rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
              No assets match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
