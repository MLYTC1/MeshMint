import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { listAssets } from "@/lib/services/marketplace";
import type { MeshAsset } from "@/types/mesh";
import { AssetCard } from "@/components/marketplace/AssetCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Plus, ShoppingBag, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Mesh Mint" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { wallet, connect, connectors, status } = useWalletConnection();
  const address = wallet?.account.address.toString();
  const [assets, setAssets] = useState<MeshAsset[]>([]);

  useEffect(() => {
    listAssets().then((a) => setAssets(a.slice(0, 4)));
  }, []);

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
          Connect wallet
        </Button>
      </div>
    );
  }

  const stats = [
    { icon: ShoppingBag, label: "Listings", value: assets.length },
    { icon: Coins, label: "Earnings", value: "12.4 SOL" },
    { icon: TrendingUp, label: "Sales (30d)", value: 47 },
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

      <h2 className="mb-4 text-xl font-semibold">Your listings</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {assets.map((a) => (
          <AssetCard key={a.id} asset={a} />
        ))}
      </div>
    </div>
  );
}
