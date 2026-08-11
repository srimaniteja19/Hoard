import { validateUrlForSsrf } from "@/lib/security/ssrfGuard";

export interface FetchOgImageSuccess {
  ok: true;
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
}

export interface FetchOgImageFailure {
  ok: false;
  rejectReason: string;
}

export type FetchOgImageResult = FetchOgImageSuccess | FetchOgImageFailure;

/**
 * Sniffs magic bytes to verify genuine binary image format.
 * Returns detected MIME type or null if unrecognized / SVG.
 */
export function sniffImageMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 8) return null;

  // Reject SVG outright (ASCII check for <svg or <?xml)
  const prefix = buffer.subarray(0, 100).toString("ascii", 0, Math.min(100, buffer.length)).toLowerCase();
  if (prefix.includes("<svg") || prefix.includes("<?xml")) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // AVIF: ....ftyp (avif / isom)
  if (buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const ftyp = buffer.subarray(8, 12).toString("ascii").toLowerCase();
    if (ftyp.includes("avif") || ftyp.includes("isom") || ftyp.includes("mif1")) {
      return "image/avif";
    }
  }

  return null;
}

/**
 * Extracts width and height from PNG, GIF, JPEG, or WebP buffer headers.
 */
export function decodeImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  const mime = sniffImageMagicBytes(buffer);
  if (!mime) return null;

  try {
    // 1. PNG: IHDR at byte 16..23
    if (mime === "image/png" && buffer.length >= 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    // 2. GIF: width at 6..7 (LE), height at 8..9 (LE)
    if (mime === "image/gif" && buffer.length >= 10) {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }

    // 3. WebP
    if (mime === "image/webp" && buffer.length >= 30) {
      // VP8X (Extended WebP format)
      if (buffer.subarray(12, 16).toString("ascii") === "VP8X") {
        const width = 1 + buffer.readUIntLE(24, 3);
        const height = 1 + buffer.readUIntLE(27, 3);
        return { width, height };
      }
      // VP8 (Lossy WebP)
      if (buffer.subarray(12, 16).toString("ascii") === "VP8 " && buffer.length >= 30) {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
      // VP8L (Lossless WebP)
      if (buffer.subarray(12, 16).toString("ascii") === "VP8L" && buffer.length >= 25) {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
    }

    // 4. JPEG: Scan markers for SOF0 (0xC0), SOF2 (0xC2), etc.
    if (mime === "image/jpeg") {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2), SOF3 (0xC3)
        if (marker >= 0xc0 && marker <= 0xc3 && marker !== 0xc4) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const blockLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + blockLength;
      }
    }
  } catch {
    // Return null if dimension parsing fails
  }

  return null;
}

/**
 * Fetches an image with SSRF guard, redirect validation, 8s timeout, retries,
 * magic byte sniffing, SVG rejection, size/dimension limits, and aspect ratio validation.
 */
export async function fetchAndValidateOgImage(
  imageUrl: string,
  maxRedirects = 5,
  maxRetries = 2
): Promise<FetchOgImageResult> {
  // Reject SVG URLs upfront
  if (imageUrl.toLowerCase().endsWith(".svg") || imageUrl.toLowerCase().includes(".svg?")) {
    return { ok: false, rejectReason: "svg_forbidden" };
  }

  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      attempts++;
      let currentUrl = imageUrl;
      let redirectsLeft = maxRedirects;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        let res: Response | null = null;
        while (redirectsLeft >= 0) {
          const ssrfCheck = await validateUrlForSsrf(currentUrl);
          if (!ssrfCheck.allowed) {
            return { ok: false, rejectReason: "ssrf_blocked" };
          }

          res = await fetch(currentUrl, {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: {
              "User-Agent": "Hoard-OGFetcher/1.0 (+https://hoard.app)",
              Accept: "image/webp,image/avif,image/png,image/jpeg;q=0.9,*/*;q=0.8",
            },
          });

          // Follow redirects manually with SSRF re-validation per hop
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get("location");
            if (!loc) {
              return { ok: false, rejectReason: "redirect_missing_location" };
            }
            currentUrl = new URL(loc, currentUrl).toString();
            redirectsLeft--;
            continue;
          }
          break;
        }

        if (!res || !res.ok) {
          if (attempts <= maxRetries) {
            await new Promise((r) => setTimeout(r, attempts * 200));
            continue;
          }
          return { ok: false, rejectReason: `http_status_${res?.status || 500}` };
        }

        // Validate Content-Type header (Reject SVG outright)
        const contentType = (res.headers.get("content-type") || "").toLowerCase();
        if (contentType.includes("svg") || contentType.includes("xml")) {
          return { ok: false, rejectReason: "svg_forbidden" };
        }

        if (
          !contentType.includes("image/jpeg") &&
          !contentType.includes("image/jpg") &&
          !contentType.includes("image/png") &&
          !contentType.includes("image/webp") &&
          !contentType.includes("image/avif") &&
          !contentType.includes("image/gif")
        ) {
          return { ok: false, rejectReason: "unsupported_content_type" };
        }

        // 5MB hard cap streaming check
        const reader = res.body?.getReader();
        let totalBytes = 0;
        const chunks: Uint8Array[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              totalBytes += value.length;
              if (totalBytes > 5 * 1024 * 1024) {
                reader.cancel();
                return { ok: false, rejectReason: "exceeded_5mb_limit" };
              }
              chunks.push(value);
            }
          }
        }

        const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));

        // Sniff magic bytes
        const sniffedType = sniffImageMagicBytes(buffer);
        if (!sniffedType) {
          return { ok: false, rejectReason: "invalid_magic_bytes" };
        }

        // Decode dimensions & validate limits
        const dims = decodeImageDimensions(buffer);
        const width = dims?.width || 0;
        const height = dims?.height || 0;

        // Reject tracking pixels / logos (< 200x100)
        if (width > 0 && height > 0) {
          if (width < 200 || height < 100) {
            return { ok: false, rejectReason: "too_small" };
          }

          // Aspect ratio checks (reject > 5:1 banner or < 1:3 skyscraper)
          const ratio = width / height;
          if (ratio > 5.0 || ratio < (1 / 3.0)) {
            return { ok: false, rejectReason: "bad_aspect_ratio" };
          }
        }

        return {
          ok: true,
          buffer,
          contentType: sniffedType,
          width,
          height,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      if (attempts <= maxRetries) {
        await new Promise((r) => setTimeout(r, attempts * 200));
        continue;
      }
      return { ok: false, rejectReason: "fetch_timeout_or_network_error" };
    }
  }

  return { ok: false, rejectReason: "max_retries_exceeded" };
}
