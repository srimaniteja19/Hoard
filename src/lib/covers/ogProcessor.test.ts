import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { processOgImage, rgbToHex } from "./ogProcessor";

describe("rgbToHex", () => {
  it("converts RGB numbers to uppercase hex strings", () => {
    expect(rgbToHex(255, 0, 0)).toBe("#FF0000");
    expect(rgbToHex(0, 240, 255)).toBe("#00F0FF");
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });
});

describe("processOgImage (§3.3 Processing & EXIF Strip)", () => {
  it("processes image, resizes to max 640px WebP, extracts dominant color, generates LQIP, and STRIPS EXIF metadata", async () => {
    // Generate a 400x300 red image with mock metadata using sharp
    const inputBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 255, g: 0, b: 128 },
      },
    })
      .jpeg()
      .toBuffer();

    const res = await processOgImage(inputBuffer, `test_cover_${Date.now()}.webp`);

    expect(res.key).toBeDefined();
    expect(res.width).toBeLessThanOrEqual(640);
    expect(res.dominantColor).toMatch(/^#FF00/);
    expect(res.lqip).toMatch(/^data:image\/webp;base64,/);

    // Verify metadata of processed buffer
    const processedMetadata = await sharp(res.processedBuffer).metadata();
    expect(processedMetadata.format).toBe("webp");
    // Verify EXIF metadata is completely stripped
    expect(processedMetadata.exif).toBeUndefined();
    expect(processedMetadata.iptc).toBeUndefined();
  });
});
