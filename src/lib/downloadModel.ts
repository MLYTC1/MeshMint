/**
 * Trigger a browser download for a 3D model URL (.glb / .gltf).
 * Uses fetch+blob when CORS allows (reliable filename). Falls back to a
 * navigation-based download for strict cross-origin URLs.
 */
function safeFileBaseName(title: string, fallback: string): string {
  const s = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return s || fallback;
}

function extensionFromUrl(url: string): string {
  try {
    const path = new URL(url, typeof location !== "undefined" ? location.origin : "https://meshmint.local").pathname.toLowerCase();
    if (path.endsWith(".gltf")) return ".gltf";
    if (path.endsWith(".glb")) return ".glb";
  } catch {
    /* invalid URL */
  }
  return ".glb";
}

function clickDownloadLink(href: string, filename: string, openInNewTab: boolean): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener noreferrer";
  if (openInNewTab) {
    a.target = "_blank";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export type DownloadModelOptions = Readonly<{
  title: string;
  /** Used when title slug is empty */
  fallbackBase?: string;
}>;

/**
 * Downloads the file to the user's device. Resolves when the click has been
 * dispatched; rejects on obvious failures (e.g. failed fetch when CORS works but HTTP errors).
 */
export async function downloadModelFromUrl(
  modelUrl: string,
  options: DownloadModelOptions,
): Promise<void> {
  const base = safeFileBaseName(
    options.title,
    options.fallbackBase?.replace(/[<>:"/\\|?*]/g, "") || "mesh-mint-asset",
  );
  const ext = extensionFromUrl(modelUrl);
  const filename = `${base}${ext}`;

  // Local blob from upload preview — no fetch needed
  if (modelUrl.startsWith("blob:")) {
    clickDownloadLink(modelUrl, filename, false);
    return;
  }

  // data: URLs
  if (modelUrl.startsWith("data:")) {
    clickDownloadLink(modelUrl, filename, false);
    return;
  }

  try {
    const res = await fetch(modelUrl, { mode: "cors" });
    if (!res.ok) {
      throw new Error(`Could not fetch file (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    try {
      clickDownloadLink(objUrl, filename, false);
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objUrl), 120_000);
    }
  } catch {
    // Cross-origin without CORS, or fetch failed — open resource; browser may download or show Save As
    clickDownloadLink(modelUrl, filename, true);
  }
}
