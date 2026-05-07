import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelViewer } from "@/components/solana/ModelViewer";
import { useWalletConnection } from "@solana/react-hooks";
import { useMarketplaceActions, useChainAssets } from "@/hooks/useMarketplace";
import { setAssetMetadata } from "@/lib/services/marketplace";
import type { Currency, LicenseType } from "@/types/mesh";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload, Sparkles } from "lucide-react";
import { formatSendTransactionError } from "@/lib/solana/sendError";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Create listing — Mesh Mint" }] }),
  component: UploadPage,
});

function makeAssetId(title: string): string {
  // 12-char rand suffix keeps PDA-uniqueness even when titles collide.
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  const rand = Math.random().toString(36).slice(2, 10);
  const suffix = `${Date.now().toString(36)}-${rand}`;
  return slug ? `${slug}-${suffix}` : `asset-${suffix}`;
}

function UploadPage() {
  const { wallet, connect, connectors, status } = useWalletConnection();
  const walletAddress = wallet?.account.address.toString();
  const actions = useMarketplaceActions();
  const chain = useChainAssets();
  const navigate = useNavigate();

  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState<number | undefined>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("1.0");
  const [currency, setCurrency] = useState<Currency>("SOL");
  const [license, setLicense] = useState<LicenseType>("personal");
  const [submitting, setSubmitting] = useState(false);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      toast.error("Please upload a .glb or .gltf file");
      return;
    }
    setModelUrl(URL.createObjectURL(file));
    setFileSizeMb(Number((file.size / (1024 * 1024)).toFixed(2)));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      if (connectors[0]) {
        await connect(connectors[0].id);
      }
      return;
    }
    if (!modelUrl) {
      toast.error("Upload a 3D file first");
      return;
    }
    if (!actions) {
      toast.error("Wallet session not ready");
      return;
    }

    setSubmitting(true);
    try {
      const numericPrice = Number(price) || 0;
      // Convert USDC -> approx SOL at a fixed devnet ratio (130 USD/SOL).
      // The on-chain program only handles SOL; this is a UX-level conversion.
      const priceSol = currency === "SOL" ? numericPrice : numericPrice / 130;
      if (priceSol <= 0) {
        throw new Error("Price must be greater than 0");
      }

      const assetId = makeAssetId(title);

      // Save off-chain metadata BEFORE sending the tx so even if we navigate
      // away mid-confirmation, the chain refetch will resolve the metadata.
      setAssetMetadata(assetId, {
        title: title.trim() || "Untitled asset",
        description: description.trim() || "Newly minted Mesh Mint asset.",
        modelUrl,
        currency,
        priceUsdc: currency === "USDC" ? numericPrice : numericPrice * 130,
        tags: ["new", license],
        fileSizeMb,
      });

      const signature = await actions.createAsset({
        assetId,
        priceSol,
        license,
      });

      // Refetch chain data so the marketplace shows the new listing.
      void chain.refresh();

      toast.success("Listing published on-chain", {
        description: `Signature ${signature.slice(0, 10)}…`,
      });
      navigate({ to: "/marketplace" });
    } catch (err) {
      console.error("[upload] mint failed", err);
      toast.error("Failed to publish listing", {
        description: formatSendTransactionError(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Create a listing
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload a 3D asset, set your license, mint on Solana.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left — preview / upload */}
        <div className="space-y-4">
          {modelUrl ? (
            <ModelViewer url={modelUrl} className="aspect-[4/3] w-full" />
          ) : (
            <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-card transition-colors hover:border-primary/40 hover:bg-card/80">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-mint shadow-glow">
                <Upload className="h-6 w-6 text-primary-foreground" />
              </div>
              <p className="font-medium">Drop a .glb or .gltf file</p>
              <p className="text-xs text-muted-foreground">
                Up to 100MB · Rendered with Three.js
              </p>
              <input
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={onFile}
              />
            </label>
          )}
          {modelUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModelUrl(null)}
            >
              Replace file
            </Button>
          )}
        </div>

        {/* Right — metadata */}
        <Card className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cyberpunk Helmet"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included, intended use, materials…"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => setCurrency(v as Currency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>License type</Label>
            <Select
              value={license}
              onValueChange={(v) => setLicense(v as LicenseType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal use only</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="extended">Extended (resellable)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full gap-2 shadow-glow"
          >
            <Sparkles className="h-4 w-4" />
            {submitting
              ? "Minting…"
              : walletAddress
                ? "Mint & publish listing"
                : status === "connecting"
                  ? "Connecting..."
                  : "Connect wallet"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Settled on-chain via your Mesh Mint marketplace program. 5% fee to
            treasury, 95% to creator.
          </p>
        </Card>
      </form>
    </div>
  );
}
