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
import {
  uploadModel,
  uploadMetadata,
  resolveGatewayUrl,
  isPinataConfigured,
  type AssetMetadataJson,
} from "@/lib/pinata";
import type { Currency, LicenseType } from "@/types/mesh";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload, Sparkles } from "lucide-react";
import { formatSendTransactionError } from "@/lib/solana/sendError";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Create listing — Mesh Mint" }] }),
  component: UploadPage,
});

function UploadPage() {
  const { wallet, connect, connectors, status } = useWalletConnection();
  const walletAddress = wallet?.account.address.toString();
  const actions = useMarketplaceActions();
  const chain = useChainAssets();
  const navigate = useNavigate();

  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelPreviewUrl, setModelPreviewUrl] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState<number | undefined>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("1.0");
  const [currency, setCurrency] = useState<Currency>("SOL");
  const [license, setLicense] = useState<LicenseType>("personal");
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      toast.error("Please upload a .glb or .gltf file");
      return;
    }
    setModelFile(file);
    setModelPreviewUrl(URL.createObjectURL(file));
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
    if (!modelFile || !modelPreviewUrl) {
      toast.error("Upload a 3D file first");
      return;
    }
    if (!actions) {
      toast.error("Wallet session not ready");
      return;
    }
    if (!isPinataConfigured()) {
      toast.error("Pinata not configured", {
        description: "Set VITE_PINATA_JWT in your .env file to enable uploads.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const numericPrice = Number(price) || 0;
      const priceSol = currency === "SOL" ? numericPrice : numericPrice / 130;
      if (priceSol <= 0) {
        throw new Error("Price must be greater than 0");
      }

      // 1. Upload 3D model file to Pinata/IPFS
      setUploadProgress("Uploading 3D model to IPFS…");
      const { cid: modelCid } = await uploadModel(modelFile);

      // 2. Upload metadata JSON to Pinata/IPFS
      setUploadProgress("Uploading metadata to IPFS…");
      const metadataJson: AssetMetadataJson = {
        title: title.trim() || "Untitled asset",
        description: description.trim() || "Newly minted Mesh Mint asset.",
        modelCid,
        creator: walletAddress,
        license,
        tags: ["new", license],
        createdAt: new Date().toISOString(),
        fileName: modelFile.name,
        mimeType: modelFile.name.endsWith(".gltf")
          ? "model/gltf+json"
          : "model/gltf-binary",
        priceSol,
        priceUsdc: currency === "USDC" ? numericPrice : numericPrice * 130,
        currency,
        fileSizeMb,
      };
      const { cid: metadataCid } = await uploadMetadata(metadataJson);

      // 3. Save optimistic metadata so the asset renders immediately
      //    even before the IPFS gateway propagates.
      const modelUrl = resolveGatewayUrl(modelCid);
      setAssetMetadata(metadataCid, {
        title: metadataJson.title,
        description: metadataJson.description,
        modelUrl,
        modelCid,
        currency: metadataJson.currency as Currency,
        priceUsdc: metadataJson.priceUsdc,
        tags: metadataJson.tags,
        fileSizeMb: metadataJson.fileSizeMb,
      });

      // 4. Create on-chain asset with metadata CID as the asset_id
      setUploadProgress("Minting on-chain…");
      const signature = await actions.createAsset({
        assetId: metadataCid,
        priceSol,
        license,
      });

      // 5. Refetch chain data so the marketplace shows the new listing
      void chain.refresh();

      toast.success("Listing published on-chain", {
        description: `Model stored on IPFS · Signature ${signature.slice(0, 10)}…`,
      });
      navigate({ to: "/marketplace" });
    } catch (err) {
      console.error("[upload] mint failed", err);
      toast.error("Failed to publish listing", {
        description: formatSendTransactionError(err),
      });
    } finally {
      setSubmitting(false);
      setUploadProgress("");
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
          {modelPreviewUrl ? (
            <ModelViewer
              url={modelPreviewUrl}
              className="aspect-[4/3] w-full"
            />
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
          {modelPreviewUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setModelFile(null);
                setModelPreviewUrl(null);
              }}
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
              ? uploadProgress || "Processing…"
              : walletAddress
                ? "Mint & publish listing"
                : status === "connecting"
                  ? "Connecting..."
                  : "Connect wallet"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Model stored on IPFS via Pinata · Settled on-chain via Solana. 5%
            fee to treasury, 95% to creator.
          </p>
        </Card>
      </form>
    </div>
  );
}
