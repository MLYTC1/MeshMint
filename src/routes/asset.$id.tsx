import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getAsset } from "@/lib/services/marketplace";
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
import { useState } from "react";
import { useMeshProgram } from "@/hooks/useMeshProgram";

export const Route = createFileRoute("/asset/$id")({
  loader: async ({ params }) => {
    const asset = await getAsset(params.id);
    if (!asset) throw notFound();
    return { asset };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.asset.title ?? "Asset"} — Mesh Mint` },
      {
        name: "description",
        content: loaderData?.asset.description ?? "Mesh Mint asset",
      },
    ],
  }),
  component: AssetDetail,
});

function AssetDetail() {
  const { asset } = Route.useLoaderData() as { asset: MeshAsset };
  const { wallet, connect, connectors, status } = useWalletConnection();
  const walletAddress = wallet?.account.address.toString();
  const program = useMeshProgram();
  const [owned, setOwned] = useState(false);
  const [pending, setPending] = useState(false);
  const [currency, setCurrency] = useState<Currency>(asset.currency);

  const onPurchase = async () => {
    if (!walletAddress) {
      if (connectors[0]) {
        await connect(connectors[0].id);
      }
      return;
    }
    setPending(true);
    try {
      if (!program) {
        throw new Error("Wallet transaction signer is unavailable");
      }
      await program.purchaseLicense({ assetId: asset.id });
      setOwned(true);
      toast.success(`License acquired for ${asset.title}`, {
        description: "On-chain verification complete.",
      });
    } catch (err) {
      toast.error("Purchase failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(false);
    }
  };

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
                value={`${asset.fileSizeMb} MB`}
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
              Settled on Solana · Verified by Mesh Mint program
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
