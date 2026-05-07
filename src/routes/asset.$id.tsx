import { createFileRoute, Link } from "@tanstack/react-router";
import {
  getDemoAsset,
  chainAssetToMeshAsset,
} from "@/lib/services/marketplace";
import type { MeshAsset, Currency } from "@/types/mesh";
import { ModelViewer } from "@/components/solana/ModelViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useWalletConnection } from "@solana/react-hooks";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES, formatPrice, getPrice } from "@/lib/pricing";
import {
  Coins,
  Download,
  ShieldCheck,
  Sparkles,
  User,
  Box,
  HardDrive,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useChainAssets, useMarketplaceActions } from "@/hooks/useMarketplace";
import { formatSendTransactionError } from "@/lib/solana/sendError";

export const Route = createFileRoute("/asset/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Asset ${params.id} — Mesh Mint` }],
  }),
  component: AssetDetail,
});

function AssetDetail() {
  const { id } = Route.useParams();
  const { wallet, connect, connectors, status } = useWalletConnection();
  const walletAddress = wallet?.account.address.toString();
  const actions = useMarketplaceActions();
  const chain = useChainAssets();

  const [demoAsset, setDemoAsset] = useState<MeshAsset | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingDemo(true);
    getDemoAsset(id).then((a) => {
      if (cancelled) return;
      setDemoAsset(a ?? null);
      setLoadingDemo(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const asset = useMemo<MeshAsset | null>(() => {
    // Prefer real chain data — match by PDA address (the canonical UI id).
    const chainHit = chain.assets.find((a) => a.address.toString() === id);
    if (chainHit) {
      return chainAssetToMeshAsset({
        address: chainHit.address.toString(),
        creator: chainHit.creator.toString(),
        assetId: chainHit.assetId,
        priceSol: chainHit.priceSol,
        license: chainHit.license,
        createdAtUnix: chainHit.createdAtUnix,
      });
    }
    return demoAsset;
  }, [chain.assets, demoAsset, id]);

  const [owned, setOwned] = useState(false);
  const [pending, setPending] = useState(false);
  const [currency, setCurrency] = useState<Currency>("SOL");

  useEffect(() => {
    if (asset) setCurrency(asset.currency);
  }, [asset]);

  const onPurchase = async () => {
    if (!asset) return;
    if (!walletAddress) {
      if (connectors[0]) await connect(connectors[0].id);
      return;
    }
    if (!actions) {
      toast.error("Wallet session not ready");
      return;
    }

    // Demo assets aren't on-chain; surface a clear message instead of crashing.
    const chainHit = chain.assets.find((a) => a.address.toString() === id);
    if (!chainHit) {
      toast.error("Demo asset", {
        description: "This is curated demo content — not yet minted on-chain.",
      });
      return;
    }

    setPending(true);
    try {
      const signature = await actions.purchaseAsset({
        assetId: chainHit.assetId,
        creator: chainHit.creator.toString(),
      });
      setOwned(true);
      toast.success(`License acquired for ${asset.title}`, {
        description: `Signature ${signature.slice(0, 10)}…`,
      });
    } catch (err) {
      console.error("[asset] purchase failed", err);
      toast.error("Purchase failed", {
        description: formatSendTransactionError(err),
      });
    } finally {
      setPending(false);
    }
  };

  if (loadingDemo && chain.isLoading) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center text-muted-foreground">
        Loading asset…
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold">Asset not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That asset isn't in the mesh.
        </p>
        <Button asChild className="mt-6 shadow-glow">
          <Link to="/marketplace">Back to marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Preview */}
        <div className="space-y-4">
          <ModelViewer url={asset.modelUrl} className="aspect-[4/3] w-full" />
          <div className="flex flex-wrap gap-2">
            {asset.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold">About this asset</h2>
            <p className="text-sm text-muted-foreground">{asset.description}</p>
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/60 pt-6 text-sm">
              <Stat
                icon={Box}
                label="Polygons"
                value={asset.polygons?.toLocaleString() ?? "—"}
              />
              <Stat
                icon={HardDrive}
                label="File size"
                value={asset.fileSizeMb ? `${asset.fileSizeMb} MB` : "—"}
              />
              <Stat icon={Sparkles} label="Listed" value={asset.createdAt} />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card className="p-6">
            <Badge variant="secondary" className="mb-3 capitalize">
              {asset.license} license
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight">
              {asset.title}
            </h1>
            <Link
              to="/profile/$handle"
              params={{ handle: asset.creator.handle }}
              className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <User className="h-3.5 w-3.5" />@{asset.creator.handle}
            </Link>

            <div className="mt-6 rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-1 rounded-lg bg-background/60 p-1">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      currency === c
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pay in {c}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Price
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold">
                    <Coins className="h-5 w-5 text-primary" />
                    {formatPrice(asset, currency)}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  ~${getPrice(asset, "USDC").toFixed(0)} USD
                </div>
              </div>
            </div>

            {owned ? (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  License verified on-chain
                </div>
                <Button className="w-full gap-2" size="lg">
                  <Download className="h-4 w-4" />
                  Download asset
                </Button>
              </div>
            ) : (
              <Button
                onClick={onPurchase}
                disabled={pending}
                size="lg"
                className="mt-6 w-full shadow-glow"
              >
                {pending
                  ? "Processing…"
                  : walletAddress
                    ? "Purchase license"
                    : status === "connecting"
                      ? "Connecting..."
                      : "Connect wallet to buy"}
              </Button>
            )}

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Settled on Solana · 5% to treasury · 95% to creator
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-semibold">License rights</h3>
            <ul className="space-y-3 text-sm">
              <RightRow ok label="Use in personal projects" />
              <RightRow
                ok={asset.license !== "personal"}
                label="Use in commercial projects"
              />
              <RightRow
                ok={asset.license === "extended"}
                label="Resell or sublicense"
              />
              <RightRow ok label="Verifiable on-chain proof" />
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function RightRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center justify-between">
      <span
        className={
          ok ? "text-foreground" : "text-muted-foreground line-through"
        }
      >
        {label}
      </span>
      <span
        className={
          ok
            ? "text-primary text-xs font-medium"
            : "text-muted-foreground text-xs"
        }
      >
        {ok ? "Included" : "—"}
      </span>
    </li>
  );
}
