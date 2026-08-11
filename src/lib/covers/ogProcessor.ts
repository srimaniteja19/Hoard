import sharp from "sharp";
import { storeBlob } from "@/lib/storage/blobStorage";

export interface ProcessOgImageResult {
  key: string;
  width: number;
  height: number;
  dominantColor: string;
  lqip: string;
  processedBuffer: Buffer;
}

/**
 * Converts RGB numbers to hex string (e.g. #1A2B3C)
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Image processing pipeline (§3.3):
 * 1. Resizes image to max 640px wide (fit: cover).
 * 2. Converts to WebP quality 75.
 * 3. STRIPS ALL EXIF METADATA (.withMetadata(false)).
 * 4. Extracts dominant color via sharp.stats().
 * 5. Generates ~200-byte base64 LQIP placeholder (16px wide).
 * 6. Stores to blob storage and returns key.
 */
export async function processOgImage(
  inputBuffer: Buffer,
  keyHint: string
): Promise<ProcessOgImageResult> {
  const sharpInput = sharp(inputBuffer);

  // 1. Process 640px WebP with metadata stripped
  const processedBuffer = await sharpInput
    .clone()
    .resize({ width: 640, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  const metadata = await sharp(processedBuffer).metadata();
  const width = metadata.width || 640;
  const height = metadata.height || 360;

  // 2. Extract dominant color via sharp.stats()
  let dominantColor = "#808080";
  try {
    const stats = await sharp(processedBuffer).stats();
    if (stats.channels && stats.channels.length >= 3) {
      const r = stats.channels[0].mean;
      const g = stats.channels[1].mean;
      const b = stats.channels[2].mean;
      dominantColor = rgbToHex(r, g, b);
    }
  } catch {
    dominantColor = "#808080";
  }

  // 3. Generate ~200-byte base64 LQIP placeholder (16px wide WebP, metadata stripped)
  let lqip = "";
  try {
    const lqipBuffer = await sharp(processedBuffer)
      .resize({ width: 16, withoutEnlargement: true })
      .webp({ quality: 20 })
      .toBuffer();
    lqip = `data:image/webp;base64,${lqipBuffer.toString("base64")}`;
  } catch {
    lqip = "";
  }

  // 4. Store in blob storage
  const storageKey = await storeBlob(keyHint, processedBuffer);

  return {
    key: storageKey,
    width,
    height,
    dominantColor,
    lqip,
    processedBuffer,
  };
}
