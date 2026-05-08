/**
 * Pinata / IPFS service layer.
 *
 * SECURITY NOTE: VITE_PINATA_JWT is bundled into the client because this app
 * has no backend server. In production, use Pinata presigned URLs generated
 * server-side so the JWT never reaches the browser. See:
 * https://docs.pinata.cloud/files/presigned-urls
 *
 * For reads, only the public gateway is used — no auth required.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;

const PRIMARY_GATEWAY =
  (import.meta.env.VITE_PINATA_GATEWAY as string | undefined) ??
  "gateway.pinata.cloud";

const FALLBACK_GATEWAYS = ["ipfs.io", "cloudflare-ipfs.com", "dweb.link"];

const UPLOAD_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export function isPinataConfigured(): boolean {
  return Boolean(PINATA_JWT);
}

// ---------------------------------------------------------------------------
// Standardized metadata schema
// ---------------------------------------------------------------------------

export interface AssetMetadataJson {
  title: string;
  description: string;
  modelCid: string;
  previewImageCid?: string;
  creator: string;
  license: string;
  tags: string[];
  createdAt: string;
  fileName: string;
  mimeType: string;
  priceSol: number;
  priceUsdc: number;
  currency: string;
  fileSizeMb?: number;
  polygons?: number;
}

// ---------------------------------------------------------------------------
// Gateway resolution with fallback
// ---------------------------------------------------------------------------

export function resolveGatewayUrl(cid: string): string {
  return `https://${PRIMARY_GATEWAY}/ipfs/${cid}`;
}

function buildGatewayUrls(cid: string): string[] {
  return [
    `https://${PRIMARY_GATEWAY}/ipfs/${cid}`,
    ...FALLBACK_GATEWAYS.map((gw) => `https://${gw}/ipfs/${cid}`),
  ];
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function resilientFetch(cid: string): Promise<Response> {
  const urls = buildGatewayUrls(cid);
  let lastError: Error | null = null;

  for (const url of urls) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
        if (res.ok) return res;
        if (res.status === 404 || res.status === 400) break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  throw lastError ?? new Error(`All gateways failed for CID: ${cid}`);
}

// ---------------------------------------------------------------------------
// Upload functions — use Pinata v1 pinning API (browser-compatible)
// ---------------------------------------------------------------------------

function getJwt(): string {
  if (!PINATA_JWT) {
    throw new Error(
      "VITE_PINATA_JWT is not set. Add it to your .env file to enable IPFS uploads."
    );
  }
  return PINATA_JWT;
}

/**
 * Upload a file to Pinata using the v1 pinning API.
 * This endpoint supports CORS and works from browser clients.
 */
async function pinFile(
  file: File | Blob,
  name: string,
  keyvalues?: Record<string, string>
): Promise<{ IpfsHash: string }> {
  const jwt = getJwt();
  const form = new FormData();
  form.append("file", file, name);

  const pinataMetadata: Record<string, unknown> = { name };
  if (keyvalues) {
    pinataMetadata.keyvalues = keyvalues;
  }
  form.append("pinataMetadata", JSON.stringify(pinataMetadata));

  const res = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pinata upload failed (HTTP ${res.status}): ${text}`);
  }

  return res.json();
}

export async function uploadModel(file: File): Promise<{ cid: string }> {
  const result = await pinFile(file, file.name);
  return { cid: result.IpfsHash };
}

export async function uploadMetadata(
  metadata: AssetMetadataJson
): Promise<{ cid: string }> {
  const blob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: "application/json",
  });
  const file = new File([blob], "metadata.json", {
    type: "application/json",
  });
  const result = await pinFile(file, `${metadata.title}-metadata.json`, {
    type: "mesh-mint-metadata",
    creator: metadata.creator,
  });
  return { cid: result.IpfsHash };
}

// ---------------------------------------------------------------------------
// Read functions (no auth, public gateway only)
// ---------------------------------------------------------------------------

export async function fetchMetadataJson(
  cid: string
): Promise<AssetMetadataJson> {
  const res = await resilientFetch(cid);
  return res.json();
}

export async function resolveDownloadUrl(
  modelCid: string
): Promise<string | null> {
  const urls = buildGatewayUrls(modelCid);
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      if (res.ok) return url;
    } catch {
      continue;
    }
  }
  return null;
}
