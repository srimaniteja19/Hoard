import { describe, expect, it } from "vitest";
import { cleanTitle, extractYouTubeVideoId, extractTitleFromUrl, isGenericTitle } from "./cleanTitle";

describe("extractYouTubeVideoId", () => {
  it("extracts ID from standard watch URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=MP01GcI6J4A")).toBe("MP01GcI6J4A");
    expect(extractYouTubeVideoId("https://youtube.com/watch?v=kCc8FmEb1nY&t=120s")).toBe("kCc8FmEb1nY");
  });

  it("extracts ID from short youtu.be URL", () => {
    expect(extractYouTubeVideoId("https://youtu.be/MP01GcI6J4A")).toBe("MP01GcI6J4A");
    expect(extractYouTubeVideoId("https://youtu.be/MP01GcI6J4A?si=xyz123")).toBe("MP01GcI6J4A");
  });

  it("extracts ID from YouTube Shorts URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/MP01GcI6J4A")).toBe("MP01GcI6J4A");
    expect(extractYouTubeVideoId("https://youtube.com/shorts/MP01GcI6J4A?feature=share")).toBe("MP01GcI6J4A");
  });

  it("extracts ID from YouTube Embed URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/MP01GcI6J4A")).toBe("MP01GcI6J4A");
  });

  it("returns null for non-YouTube URLs", () => {
    expect(extractYouTubeVideoId("https://github.com/pgvector/pgvector")).toBeNull();
    expect(extractYouTubeVideoId("https://example.com/watch?v=123")).toBeNull();
  });
});

describe("extractTitleFromUrl", () => {
  it("extracts clean title for YouTube URLs", () => {
    expect(extractTitleFromUrl("https://youtu.be/MP01GcI6J4A")).toBe("YouTube Video");
    expect(extractTitleFromUrl("https://www.youtube.com/watch?v=MP01GcI6J4A")).toBe("YouTube Video");
    expect(extractTitleFromUrl("https://www.youtube.com/shorts/MP01GcI6J4A")).toBe("YouTube Video");
  });

  it("extracts GitHub repo names", () => {
    expect(extractTitleFromUrl("https://github.com/pgvector/pgvector")).toBe("pgvector/pgvector");
    expect(extractTitleFromUrl("https://github.com/facebook/react.git")).toBe("facebook/react");
  });

  it("extracts arXiv paper IDs", () => {
    expect(extractTitleFromUrl("https://arxiv.org/abs/2005.11401")).toBe("arXiv:2005.11401");
    expect(extractTitleFromUrl("https://arxiv.org/pdf/2005.11401.pdf")).toBe("arXiv:2005.11401");
  });

  it("extracts slug from article URL path", () => {
    expect(extractTitleFromUrl("https://alexdebrie.com/posts/dynamodb-single-table-design/")).toBe("Dynamodb Single Table Design");
  });
});

describe("cleanTitle", () => {
  it("uses provided title when valid", () => {
    expect(cleanTitle("How AI Models Work - YouTube", "https://youtube.com/watch?v=123")).toBe("How AI Models Work");
    expect(cleanTitle("Understanding DynamoDB | Substack", "https://substack.com/post/1")).toBe("Understanding DynamoDB");
  });

  it("falls back to URL extraction when provided title is generic or missing", () => {
    expect(cleanTitle("Untitled", "https://youtu.be/MP01GcI6J4A")).toBe("YouTube Video");
    expect(cleanTitle("404 Not Found", "https://github.com/owner/repo")).toBe("owner/repo");
    expect(cleanTitle("", "https://arxiv.org/abs/2103.00020")).toBe("arXiv:2103.00020");
  });

  it("decodes HTML entities in title", () => {
    expect(cleanTitle("Rock &amp; Roll &lsquo;Guide&rsquo;", "https://example.com")).toBe("Rock & Roll 'Guide'");
  });

  it("preserves acronyms and technical terms verbatim without mangling (LLMs, pgvector, iOS, npm)", () => {
    expect(cleanTitle("How I Use LLMs To Learn", "https://example.com")).toBe("How I Use LLMs To Learn");
    expect(cleanTitle("pgvector performance tuning", "https://example.com")).toBe("pgvector performance tuning");
    expect(cleanTitle("iOS 18 Security Updates", "https://example.com")).toBe("iOS 18 Security Updates");
    expect(cleanTitle("npm v10 Release Notes", "https://example.com")).toBe("npm v10 Release Notes");
  });
});

describe("isGenericTitle", () => {
  it("flags generic terms as true", () => {
    expect(isGenericTitle("New Bookmark")).toBe(true);
    expect(isGenericTitle("Untitled")).toBe(true);
    expect(isGenericTitle("404 Not Found")).toBe(true);
    expect(isGenericTitle("https://example.com")).toBe(true);
  });

  it("allows specific titles", () => {
    expect(isGenericTitle("Building a Vector Database in Rust")).toBe(false);
  });
});
