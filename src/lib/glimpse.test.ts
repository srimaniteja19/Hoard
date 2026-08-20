import { describe, expect, it } from "vitest";
import { GLIMPSE_HOME, youtubeUrlForGlimpse } from "./glimpse";

describe("youtubeUrlForGlimpse", () => {
  it("returns a canonical watch URL for youtube.com/watch videos", () => {
    expect(youtubeUrlForGlimpse("https://www.youtube.com/watch?v=kCc8FmEb1nY")).toBe(
      "https://www.youtube.com/watch?v=kCc8FmEb1nY"
    );
    expect(youtubeUrlForGlimpse("https://youtube.com/watch?v=kCc8FmEb1nY&t=120s")).toBe(
      "https://www.youtube.com/watch?v=kCc8FmEb1nY"
    );
  });

  it("canonicalizes youtu.be and Shorts URLs", () => {
    expect(youtubeUrlForGlimpse("https://youtu.be/kCc8FmEb1nY")).toBe(
      "https://www.youtube.com/watch?v=kCc8FmEb1nY"
    );
    expect(youtubeUrlForGlimpse("https://www.youtube.com/shorts/kCc8FmEb1nY")).toBe(
      "https://www.youtube.com/watch?v=kCc8FmEb1nY"
    );
  });

  it("returns null for playlists, non-YouTube URLs, and empty input", () => {
    expect(youtubeUrlForGlimpse("https://www.youtube.com/playlist?list=PLabc")).toBeNull();
    expect(youtubeUrlForGlimpse("https://github.com/pgvector/pgvector")).toBeNull();
    expect(youtubeUrlForGlimpse("")).toBeNull();
  });
});

describe("GLIMPSE_HOME", () => {
  it("points at Glimpse", () => {
    expect(GLIMPSE_HOME).toBe("https://glimpse.wozart.com/");
  });
});
