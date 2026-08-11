/**
 * Pure client & server URL resolver for mirrored blob storage keys (§3.3 & §7).
 * Pure browser-safe utility without Node fs/promises dependencies.
 */
export function getBlobUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key; // For fallback
  }
  return `/blobs/${encodeURIComponent(key)}`;
}
