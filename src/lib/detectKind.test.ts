import { describe, expect, it } from "vitest";
import { detectKind, detectKindFromMetadata, detectKindFromUrl } from "./detectKind";

describe("detectKindFromUrl", () => {
  it("classifies a YouTube video", () => {
    expect(detectKindFromUrl("https://www.youtube.com/watch?v=abc")).toBe("VID");
    expect(detectKindFromUrl("https://youtu.be/abc")).toBe("VID");
  });

  it("classifies a YouTube playlist", () => {
    expect(detectKindFromUrl("https://www.youtube.com/playlist?list=abc")).toBe("PLY");
  });

  it("classifies open.spotify.com and music.apple.com as playlists", () => {
    expect(detectKindFromUrl("https://open.spotify.com/playlist/37i9")).toBe("PLY");
    expect(detectKindFromUrl("https://music.apple.com/us/album/x")).toBe("PLY");
  });

  it("does NOT classify a non-music subdomain of spotify.com as a playlist", () => {
    // Regression: a marketing/portal page hosted on a spotify.com subdomain
    // is not a music link — it must fall through to null (pass 2 decides).
    expect(detectKindFromUrl("https://xirp.spotify.com")).toBeNull();
  });

  it("classifies a GitHub repo", () => {
    expect(detectKindFromUrl("https://github.com/pgvector/pgvector")).toBe("GIT");
  });

  it("does not classify a bare github.com URL as a repo", () => {
    expect(detectKindFromUrl("https://github.com")).toBeNull();
  });

  it("classifies arxiv/acm/ieee as papers", () => {
    expect(detectKindFromUrl("https://arxiv.org/abs/2005.11401")).toBe("PPR");
    expect(detectKindFromUrl("https://dl.acm.org/doi/10.1145/123")).toBe("PPR");
  });

  it("classifies known app/tool hosts", () => {
    expect(detectKindFromUrl("https://www.raycast.com")).toBe("APP");
    expect(detectKindFromUrl("https://apps.apple.com/us/app/x")).toBe("APP");
  });

  it("classifies docs subdomains and /docs/ paths", () => {
    expect(detectKindFromUrl("https://docs.stripe.com/api")).toBe("DOC");
    expect(detectKindFromUrl("https://example.com/docs/getting-started")).toBe("DOC");
  });

  it("returns null for an unrecognized domain — no guessing at the URL layer", () => {
    expect(detectKindFromUrl("https://portfoliolab.ai")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(detectKindFromUrl("")).toBeNull();
  });
});

describe("detectKindFromMetadata", () => {
  it("maps og:type article/book to ART", () => {
    expect(detectKindFromMetadata("article")).toBe("ART");
    expect(detectKindFromMetadata("book")).toBe("ART");
  });

  it("maps og:type video.* to VID", () => {
    expect(detectKindFromMetadata("video.other")).toBe("VID");
  });

  it("maps og:type music.* to PLY", () => {
    expect(detectKindFromMetadata("music.song")).toBe("PLY");
  });

  it("defaults website/product/missing to APP, not ART", () => {
    expect(detectKindFromMetadata("website")).toBe("APP");
    expect(detectKindFromMetadata("product")).toBe("APP");
    expect(detectKindFromMetadata(null)).toBe("APP");
    expect(detectKindFromMetadata(undefined)).toBe("APP");
  });
});

describe("detectKind (two-pass)", () => {
  it("prefers the URL-pattern match over metadata", () => {
    expect(detectKind("https://github.com/pgvector/pgvector", "website")).toBe("GIT");
  });

  it("falls back to metadata when the URL alone is ambiguous", () => {
    expect(detectKind("https://portfoliolab.ai", "website")).toBe("APP");
    expect(detectKind("https://someblog.example.com/posts/1", "article")).toBe("ART");
  });

  it("falls back to APP when neither URL nor metadata gives a signal", () => {
    expect(detectKind("https://portfoliolab.ai")).toBe("APP");
  });
});
