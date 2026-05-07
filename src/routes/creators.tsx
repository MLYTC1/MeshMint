import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAssets } from "@/lib/services/marketplace";
import type { MeshAsset } from "@/types/mesh";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  reputation: number;
  count: number;
  bio: string;
}

function CreatorsPage() {
  const [creators, setCreators] = useState<CreatorAgg[]>([]);

  useEffect(() => {
    listAssets().then((assets: MeshAsset[]) => {
      const map = new Map<string, CreatorAgg>();
      for (const a of assets) {
        const existing = map.get(a.creator.handle);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(a.creator.handle, {
            handle: a.creator.handle,
            wallet: a.creator.wallet,
            reputation: a.creator.reputation ?? 0,
            count: 1,
            bio: "Independent 3D artist crafting on-chain assets for the Mesh Mint economy.",
          });
        }
      }
      setCreators(
        [...map.values()].sort((a, b) => b.reputation - a.reputation)
      );
    });
  }, []);

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
          {creators.length} verified artists shipping 3D assets on Solana.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {creators.map((c) => (
          <Link
            key={c.handle}
            to="/profile/$handle"
            params={{ handle: c.handle }}
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
                    @{c.handle}
                  </h3>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {c.wallet}
                  </p>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                {c.bio}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                <Badge variant="outline">{c.count} assets</Badge>
                <span className="text-xs text-muted-foreground">
                  Rep <span className="text-foreground">{c.reputation}</span>
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
