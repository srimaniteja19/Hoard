import { describe, it, expect } from "vitest";
import { fetchAndValidateOgImage, sniffImageMagicBytes, decodeImageDimensions } from "./ogFetcher";
import { discoverOgImageCandidate } from "./ogDiscovery";

describe("discoverOgImageCandidate", () => {
  it("discovers og:image:secure_url first", () => {
    const html = `
      <head>
        <meta property="og:image" content="http://example.com/fallback.png" />
        <meta property="og:image:secure_url" content="https://example.com/secure.png" />
      </head>
    `;
    const cand = discoverOgImageCandidate(html, "https://example.com");
    expect(cand?.url).toBe("https://example.com/secure.png");
  });

  it("discovers og:image second", () => {
    const html = `
      <head>
        <meta property="og:image" content="https://example.com/og.png" />
        <meta name="twitter:image" content="https://example.com/tw.png" />
      </head>
    `;
    const cand = discoverOgImageCandidate(html, "https://example.com");
    expect(cand?.url).toBe("https://example.com/og.png");
  });

  it("discovers twitter:image third", () => {
    const html = `
      <head>
        <meta name="twitter:image" content="https://example.com/tw.png" />
      </head>
    `;
    const cand = discoverOgImageCandidate(html, "https://example.com");
    expect(cand?.url).toBe("https://example.com/tw.png");
  });
});

describe("sniffImageMagicBytes & decodeImageDimensions", () => {
  it("rejects SVG content", () => {
    const svgBuf = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><circle/></svg>");
    expect(sniffImageMagicBytes(svgBuf)).toBeNull();
  });

  it("sniffs PNG magic bytes and decodes dimensions", () => {
    // Construct 200x100 PNG header buffer
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length & type
      0x00, 0x00, 0x00, 0xc8, // Width = 200
      0x00, 0x00, 0x00, 0x64, // Height = 100
      0x08, 0x02, 0x00, 0x00, 0x00,
    ]);
    expect(sniffImageMagicBytes(pngHeader)).toBe("image/png");
    const dims = decodeImageDimensions(pngHeader);
    expect(dims).toEqual({ width: 200, height: 100 });
  });

  it("sniffs GIF magic bytes and decodes dimensions", () => {
    // 1x1 1-pixel GIF buffer
    const gif1x1 = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA=", "base64");
    expect(sniffImageMagicBytes(gif1x1)).toBe("image/gif");
    const dims = decodeImageDimensions(gif1x1);
    expect(dims).toEqual({ width: 1, height: 1 });
  });
});

describe("fetchAndValidateOgImage (§3.2 Security Validation)", () => {
  it("rejects SSRF cloud metadata endpoint (169.254.169.254)", async () => {
    const res = await fetchAndValidateOgImage("http://169.254.169.254/latest/meta-data/");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.rejectReason).toBe("ssrf_blocked");
    }
  });

  it("rejects loopback address (127.0.0.1)", async () => {
    const res = await fetchAndValidateOgImage("http://127.0.0.1:8080/image.png");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.rejectReason).toBe("ssrf_blocked");
    }
  });

  it("rejects SVG URLs upfront", async () => {
    const res = await fetchAndValidateOgImage("https://example.com/logo.svg");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.rejectReason).toBe("svg_forbidden");
    }
  });
});
