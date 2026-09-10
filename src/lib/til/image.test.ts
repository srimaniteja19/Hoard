import { describe, it, expect } from "vitest";
import { parseTilImages, formatTilImages } from "./image";

describe("parseTilImages & formatTilImages", () => {
  it("handles null, undefined, or empty string", () => {
    expect(parseTilImages(null)).toEqual([]);
    expect(parseTilImages(undefined)).toEqual([]);
    expect(parseTilImages("")).toEqual([]);
    expect(parseTilImages("   ")).toEqual([]);
  });

  it("handles single URL string", () => {
    const single = "/api/til/assets/123-abc";
    expect(parseTilImages(single)).toEqual(["/api/til/assets/123-abc"]);
  });

  it("handles JSON array string of URLs", () => {
    const jsonStr = JSON.stringify([
      "/api/til/assets/img-1",
      "/api/til/assets/img-2",
    ]);
    expect(parseTilImages(jsonStr)).toEqual([
      "/api/til/assets/img-1",
      "/api/til/assets/img-2",
    ]);
  });

  it("gracefully falls back if JSON is malformed", () => {
    expect(parseTilImages("[invalid json")).toEqual(["[invalid json"]);
  });

  it("formats images correctly for DB persistence", () => {
    expect(formatTilImages([])).toBeNull();
    expect(formatTilImages(["   "])).toBeNull();
    expect(formatTilImages(["/api/til/assets/123"])).toBe("/api/til/assets/123");
    expect(formatTilImages(["/api/til/assets/1", "/api/til/assets/2"])).toBe(
      JSON.stringify(["/api/til/assets/1", "/api/til/assets/2"])
    );
  });
});
