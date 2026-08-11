import fs from "fs/promises";
import path from "path";

/**
 * Blob Storage Manager for HOARD (§3.3 & §7)
 * Mirrors scraped images locally / in blob storage and serves via key.
 * Never hotlinks remote URLs.
 */
const BLOB_DIR = path.join(process.cwd(), "public", "blobs");

async function ensureBlobDir() {
  try {
    await fs.mkdir(BLOB_DIR, { recursive: true });
  } catch {
    // Exists
  }
}

export async function storeBlob(key: string, buffer: Buffer): Promise<string> {
  await ensureBlobDir();
  const filePath = path.join(BLOB_DIR, key);
  await fs.writeFile(filePath, buffer);
  return key;
}

export async function readBlob(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const filePath = path.join(BLOB_DIR, key);
    const buffer = await fs.readFile(filePath);
    return { buffer, contentType: "image/webp" };
  } catch {
    return null;
  }
}

export { getBlobUrl } from "./blobUrl";
