/**
 * StreamXBD Web Provider Adapter
 *
 * Reads CloudStream repository manifests as metadata only. CloudStream
 * extensions are Kotlin/JVM binaries and are never executed in the browser.
 * A web provider must be implemented separately and registered with this layer.
 */

export const DEFAULT_REPOSITORY_URL =
  "https://raw.githubusercontent.com/phisher98/cloudstream-extensions-phisher/refs/heads/builds/repo.json";

const API_BASE = "/api";

export class ProviderAdapterError extends Error {
  constructor(message, code = "PROVIDER_ADAPTER_ERROR") {
    super(message);
    this.name = "ProviderAdapterError";
    this.code = code;
  }
}

export async function loadRepositoryManifest({ signal } = {}) {
  const response = await fetch(`${API_BASE}/manifest`, {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ProviderAdapterError(
      payload?.error || `Repository request failed (${response.status})`,
      "MANIFEST_FETCH_FAILED",
    );
  }

  // The Worker returns { manifest, source, note }. Also tolerate a raw
  // manifest response so this adapter can be used with a compatible API.
  const manifest = payload && Array.isArray(payload.providers)
    ? payload.providers
    : payload && Object.hasOwn(payload, "manifest")
      ? payload.manifest
      : payload;

  if (!manifest || (typeof manifest !== "object" && !Array.isArray(manifest))) {
    throw new ProviderAdapterError("Repository returned an invalid manifest.", "INVALID_MANIFEST");
  }

  return {
    manifest,
    source: payload?.source || "repository",
    note: payload?.note || "Manifest metadata only; extensions are not executed.",
    providerListCount: payload?.providerListCount || 0,
    errors: Array.isArray(payload?.errors) ? payload.errors : [],
  };
}

function asArray(manifest) {
  if (Array.isArray(manifest)) return manifest;
  if (!manifest || typeof manifest !== "object") return [];
  for (const key of ["plugins", "extensions", "providers", "repositories"]) {
    if (Array.isArray(manifest[key])) return manifest[key];
  }
  return [];
}

export function normalizeRepositoryProviders(manifest) {
  return asArray(manifest)
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => {
      const name = entry.name || entry.pluginName || entry.title || entry.id || `Provider ${index + 1}`;
      const url = entry.url || entry.downloadURL || entry.downloadUrl || entry.apk || "";
      return {
        id: String(entry.id || entry.internalName || name).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: String(name),
        version: entry.version == null ? "Unknown" : String(entry.version),
        language: entry.language || entry.lang || "Unknown",
        authors: Array.isArray(entry.authors) ? entry.authors.join(", ") : String(entry.authors || entry.author || "Unknown"),
        description: String(entry.description || entry.status || "CloudStream extension metadata"),
        downloadUrl: typeof url === "string" ? url : "",
        compatible: false,
        compatibilityLabel: "CloudStream plugin — not browser compatible",
      };
    });
}

/**
 * Register only providers implemented for web. A registered adapter should
 * return normalized metadata and media URLs from sources the site is allowed
 * to access. Do not register or execute arbitrary repository binaries.
 */
const webProviders = new Map();

export function registerWebProvider(id, adapter) {
  if (!id || !adapter || typeof adapter.search !== "function") {
    throw new ProviderAdapterError("A provider ID and search(query) function are required.", "INVALID_PROVIDER");
  }
  webProviders.set(String(id), adapter);
  return () => webProviders.delete(String(id));
}

export function getRegisteredWebProviders() {
  return Array.from(webProviders.entries()).map(([id, adapter]) => ({
    id,
    name: adapter.name || id,
    capabilities: Array.isArray(adapter.capabilities) ? adapter.capabilities : [],
  }));
}

export async function searchWebProviders(query, { signal } = {}) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) return [];

  const results = await Promise.allSettled(
    Array.from(webProviders.entries()).map(async ([providerId, adapter]) => {
      const items = await adapter.search(normalizedQuery, { signal });
      if (!Array.isArray(items)) return [];
      return items.map((item, index) => ({
        ...item,
        id: String(item.id || `${providerId}-${index}`),
        providerId,
        providerName: adapter.name || providerId,
      }));
    }),
  );

  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

export function validateMediaSource(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { valid: false, type: null, reason: "No media URL provided." };
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return { valid: false, type: null, reason: "Media URL is invalid." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { valid: false, type: null, reason: "Only HTTP(S) media URLs are supported." };
  }

  const path = url.pathname.toLowerCase();
  if (path.endsWith(".m3u8")) return { valid: true, type: "hls", url: url.href };
  if (path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".ogg")) {
    return { valid: true, type: "file", url: url.href };
  }
  if (path.endsWith(".mpd")) {
    return { valid: false, type: "dash", url: url.href, reason: "DASH needs a dedicated player integration." };
  }
  return {
    valid: false,
    type: "unknown",
    url: url.href,
    reason: "The URL does not identify a supported media format (MP4/WebM/Ogg/HLS).",
  };
}
