import { describe, expect, it } from "vitest";
import {
  extractInstagramId,
  extractTikTokId,
  extractUrlFromEmbedCode,
  getMediaThumbnailUrl,
  parseMediaUrl,
} from "./mediaEmbed";

describe("mediaEmbed parser", () => {
  describe("extractUrlFromEmbedCode", () => {
    it("handles plain URLs unchanged", () => {
      expect(extractUrlFromEmbedCode("https://www.instagram.com/reel/ABC123xyz/")).toBe(
        "https://www.instagram.com/reel/ABC123xyz/"
      );
    });

    it("extracts URL from iframe src", () => {
      const iframe = '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player"></iframe>';
      expect(extractUrlFromEmbedCode(iframe)).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });

    it("extracts URL from Instagram blockquote permalink", () => {
      const bq = '<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/reel/DEfg456/?utm_source=ig_embed"></blockquote>';
      expect(extractUrlFromEmbedCode(bq)).toBe(
        "https://www.instagram.com/reel/DEfg456/?utm_source=ig_embed"
      );
    });
  });

  describe("extractInstagramId", () => {
    it("extracts reel id and type", () => {
      const res = extractInstagramId("https://www.instagram.com/reel/DA5q8s1pQx9/?igsh=MWQ1");
      expect(res).toEqual({ id: "DA5q8s1pQx9", type: "reel" });
    });

    it("extracts standard post id and type", () => {
      const res = extractInstagramId("https://instagram.com/p/DA5q8s1pQx9/");
      expect(res).toEqual({ id: "DA5q8s1pQx9", type: "p" });
    });

    it("handles /share/reel/ links", () => {
      const res = extractInstagramId("https://www.instagram.com/share/reel/DA5q8s1pQx9");
      expect(res).toEqual({ id: "DA5q8s1pQx9", type: "reel" });
    });

    it("returns null for non-instagram links", () => {
      expect(extractInstagramId("https://youtube.com/watch?v=123")).toBeNull();
      expect(extractInstagramId("")).toBeNull();
    });
  });

  describe("extractTikTokId", () => {
    it("extracts tiktok video id", () => {
      expect(extractTikTokId("https://www.tiktok.com/@creator/video/7123456789012345678")).toBe(
        "7123456789012345678"
      );
    });
  });

  describe("parseMediaUrl", () => {
    it("parses YouTube watch URL with correct thumbnail and embedUrl", () => {
      const res = parseMediaUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(res).toEqual({
        type: "youtube",
        videoId: "dQw4w9WgXcQ",
        embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1",
        thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        isShort: false,
      });
    });

    it("parses YouTube Shorts URL as isShort: true", () => {
      const res = parseMediaUrl("https://youtube.com/shorts/O91DT1pR1ew?feature=share");
      expect(res).toEqual({
        type: "youtube",
        videoId: "O91DT1pR1ew",
        embedUrl: "https://www.youtube.com/embed/O91DT1pR1ew?rel=0&modestbranding=1",
        thumbnailUrl: "https://img.youtube.com/vi/O91DT1pR1ew/hqdefault.jpg",
        originalUrl: "https://youtube.com/shorts/O91DT1pR1ew?feature=share",
        isShort: true,
      });
    });

    it("parses Instagram Reel link", () => {
      const res = parseMediaUrl("https://www.instagram.com/reel/DA5q8s1pQx9/");
      expect(res).toEqual({
        type: "instagram",
        mediaId: "DA5q8s1pQx9",
        mediaType: "reel",
        embedUrl: "https://www.instagram.com/reel/DA5q8s1pQx9/embed/",
        originalUrl: "https://www.instagram.com/reel/DA5q8s1pQx9/",
      });
    });

    it("parses standard image URL as type: image", () => {
      const res = parseMediaUrl("https://images.unsplash.com/photo-1234.jpg");
      expect(res).toEqual({
        type: "image",
        url: "https://images.unsplash.com/photo-1234.jpg",
      });
    });

    it("returns null for empty or invalid inputs", () => {
      expect(parseMediaUrl(null)).toBeNull();
      expect(parseMediaUrl("")).toBeNull();
      expect(parseMediaUrl("   ")).toBeNull();
    });
  });

  describe("getMediaThumbnailUrl", () => {
    it("returns YouTube thumbnail URL", () => {
      expect(getMediaThumbnailUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
      );
    });

    it("returns original image URL for direct image links", () => {
      expect(getMediaThumbnailUrl("https://example.com/cover.png")).toBe(
        "https://example.com/cover.png"
      );
    });

    it("returns null for Instagram without static image API", () => {
      expect(getMediaThumbnailUrl("https://www.instagram.com/reel/DA5q8s1pQx9/")).toBeNull();
    });
  });
});
