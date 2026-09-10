/**
 * Client-side image compression, upload, and clipboard utilities for TIL
 */

export interface UploadedTilAsset {
  id: string;
  url: string;
  filename: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  markdown: string;
}

/**
 * Rapid in-browser image optimization:
 * - Uses createImageBitmap / Canvas.toBlob for fast background processing
 * - Preserves SVG and GIF animation, optimizes large PNG/JPEG to clean WebP
 */
export async function compressImageToBlob(
  file: File | Blob,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ blob: Blob; filename: string; width: number; height: number }> {
  const originalName = file instanceof File ? file.name : "til-attachment.webp";
  const originalType = file.type || "image/png";

  // If already SVG or GIF, or small WebP/JPEG under 600KB, upload as-is
  if (
    originalType === "image/svg+xml" ||
    originalType === "image/gif" ||
    ((originalType === "image/webp" || originalType === "image/jpeg") && file.size < 600 * 1024)
  ) {
    return {
      blob: file,
      filename: originalName,
      width: 0,
      height: 0,
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      bitmap.close();
      return { blob: file, filename: originalName, width: bitmap.width, height: bitmap.height };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const cleanName = originalName.replace(/\.[^.]+$/, "") + ".webp";

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        "image/webp",
        quality
      );
    });

    if (blob) {
      return {
        blob,
        filename: cleanName,
        width,
        height,
      };
    }
  } catch (err) {
    console.warn("createImageBitmap failed, falling back to original file", err);
  }

  return {
    blob: file,
    filename: originalName,
    width: 0,
    height: 0,
  };
}

/**
 * Uploads an image to the TIL assets API endpoint
 */
export async function uploadTilImage(
  file: File | Blob
): Promise<UploadedTilAsset> {
  const { blob, filename, width, height } = await compressImageToBlob(file);

  const formData = new FormData();
  formData.append("file", blob, filename);
  if (width) formData.append("width", String(width));
  if (height) formData.append("height", String(height));

  const res = await fetch("/api/til/assets", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(errData.error || `Upload failed with status ${res.status}`);
  }

  const asset = await res.json();
  const altText = filename.replace(/\.[^.]+$/, "");
  const markdown = `![${altText}](${asset.url})`;

  return {
    ...asset,
    markdown,
  };
}

/**
 * Extracts image files from clipboard paste event
 */
export function extractImagesFromClipboard(
  e: React.ClipboardEvent | ClipboardEvent
): File[] {
  const items = e.clipboardData?.items;
  if (!items) return [];

  const imageFiles: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) imageFiles.push(file);
    }
  }

  return imageFiles;
}

/**
 * Extracts image files from drag & drop event
 */
export function extractImagesFromDragEvent(
  e: React.DragEvent | DragEvent
): File[] {
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return [];

  const imageFiles: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type.startsWith("image/")) {
      imageFiles.push(file);
    }
  }

  return imageFiles;
}

/**
 * Parses raw imageUrl from TIL entry (can be single URL or JSON array string)
 */
export function parseTilImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((u): u is string => typeof u === "string" && Boolean(u.trim()))
          .map((u) => u.trim());
      }
    } catch {
      // Fallback
    }
  }

  return [trimmed];
}

/**
 * Serializes list of image URLs for storage in til_entries.image_url
 */
export function formatTilImages(images: string[]): string | null {
  const cleaned = images.map((img) => img.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify(cleaned);
}
