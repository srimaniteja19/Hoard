/**
 * Client-side image compression and upload utilities for Scratch
 */

export interface PreparedImage {
  dataUrl: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface UploadedScrapAsset {
  id: string;
  url: string;
  filename: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  markdown: string;
}

/**
 * Resizes and compresses image in-browser to WebP (max 1600px, quality 0.85)
 * Keeps GIFs and SVGs in their original format to preserve animations & vector paths.
 */
export async function compressAndPrepareImage(
  file: File | Blob,
  fallbackFilename = "screenshot.webp"
): Promise<PreparedImage> {
  const filename = file instanceof File ? file.name : fallbackFilename;
  const originalType = file.type || "image/png";

  // For SVG and GIF, do not re-compress in canvas
  if (originalType === "image/svg+xml" || originalType === "image/gif") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          filename,
          mimeType: originalType,
          width: 0,
          height: 0,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let { width, height } = img;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve({
            dataUrl: reader.result as string,
            filename,
            mimeType: originalType,
            width: img.width,
            height: img.height,
          });
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP
        const targetMime = "image/webp";
        const cleanName = filename.replace(/\.[^.]+$/, "") + ".webp";
        const dataUrl = canvas.toDataURL(targetMime, 0.85);

        resolve({
          dataUrl,
          filename: cleanName,
          mimeType: targetMime,
          width,
          height,
        });
      };
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file / blob to Scratch assets API
 */
export async function uploadScrapImage(
  file: File | Blob,
  scrapId?: string
): Promise<UploadedScrapAsset> {
  const prepared = await compressAndPrepareImage(file);

  const res = await fetch("/api/scratch/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      filename: prepared.filename,
      mimeType: prepared.mimeType,
      data: prepared.dataUrl,
      width: prepared.width,
      height: prepared.height,
      scrapId,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(errData.error || `Upload failed with status ${res.status}`);
  }

  const asset = await res.json();
  const altText = prepared.filename.replace(/\.[^.]+$/, "");
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
