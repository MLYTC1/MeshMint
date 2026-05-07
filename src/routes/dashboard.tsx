import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import {
  listDemoAssets,
  chainAssetToMeshAsset,
} from "@/lib/services/marketplace";
import type { MeshAsset } from "@/types/mesh";
import { AssetCard } from "@/components/marketplace/AssetCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Plus, ShoppingBag, TrendingUp } from "lucide-react";
import { useChainAssets } from "@/hooks/useMarketplace";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Mesh Mint" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { wallet, connect, connectors, status } = useWalletConnection();
  const address = wallet?.account.address.toString();
  const chain = useChainAssets();
  const [demoAssets, setDemoAssets] = useState<MeshAsset[]>([]);

  useEffect(() => {
    listDemoAssets().then((a) => setDemoAssets(a.slice(0, 4)));
  }, []);

  const myChainListings = useMemo<MeshAsset[]>(() => {
    if (!address) return [];
    return chain.assets
      .filter((a) => a.creator.toString() === address)
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
  }, [address, chain.assets]);

  if (!address) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold">Connect your wallet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with a Solana wallet to access your creator dashboard.
        </p>
        <Button
          onClick={() => connectors[0] && connect(connectors[0].id)}
          disabled={status === "connecting" || connectors.length === 0}
          className="mt-6 shadow-glow"
        >
          {status === "connecting" ? "Connecting..." : "Connect wallet"}
        </Button>
      </div>
    );
  }

  // If creator has any on-chain listings, show those; otherwise fall back to
  // a curated demo slice so the dashboard isn't empty on a brand-new wallet.
  const displayed = myChainListings.length > 0 ? myChainListings : demoAssets;

  const earningsSol = myChainListings.reduce((acc, a) => acc + a.priceSol, 0);
  const stats = [
    { icon: ShoppingBag, label: "Listings", value: myChainListings.length },
    {
      icon: Coins,
      label: "Estimated earnings",
      value: earningsSol > 0 ? `${earningsSol.toFixed(2)} SOL` : "0 SOL",
    },
    {
      icon: TrendingUp,
      label: "On-chain status",
      value: chain.isLoading ? "Loading…" : chain.isError ? "Offline" : "Live",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Studio
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, creator
          </h1>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {address}
          </p>
        </div>
        <Button asChild size="lg" className="gap-2 shadow-glow">
          <Link to="/upload">
            <Plus className="h-4 w-4" /> New listing
          </Link>
        </Button>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-mint">
              <s.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="text-2xl font-semibold">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold">
          {myChainListings.length > 0
            ? "Your on-chain listings"
            : "Featured assets (demo)"}
        </h2>
        {myChainListings.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Mint a listing to see it here.
          </p>
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {displayed.map((a) => (
          <AssetCard key={a.id} asset={a} />
        ))}
      </div>
    </div>
  );
}
