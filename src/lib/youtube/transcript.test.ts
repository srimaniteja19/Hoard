import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  formatTimestamp,
  cleanSubtitleText,
  parseJson3Transcript,
  parseXmlTranscript,
  selectBestCaptionTrack,
  fetchYouTubeTranscript,
} from "./transcript";

describe("formatTimestamp", () => {
  it("formats short seconds correctly", () => {
    expect(formatTimestamp(0)).toBe("00:00");
    expect(formatTimestamp(5000)).toBe("00:05");
    expect(formatTimestamp(65000)).toBe("01:05");
    expect(formatTimestamp(599000)).toBe("09:59");
  });

  it("formats hours correctly", () => {
    expect(formatTimestamp(3600000)).toBe("1:00:00");
    expect(formatTimestamp(3665000)).toBe("1:01:05");
    expect(formatTimestamp(7325000)).toBe("2:02:05");
  });
});

describe("cleanSubtitleText", () => {
  it("decodes HTML entities", () => {
    expect(cleanSubtitleText("Hello &amp; welcome to the &quot;video&quot;")).toBe(
      'Hello & welcome to the "video"'
    );
    expect(cleanSubtitleText("It&#39;s a test")).toBe("It's a test");
    expect(cleanSubtitleText("&lt;Tag&gt;")).toBe("<Tag>");
  });

  it("strips residual HTML tags", () => {
    expect(cleanSubtitleText("<font color='#fff'>Subtitles</font>")).toBe("Subtitles");
    expect(cleanSubtitleText("<b>Bold text</b> and <i>italic</i>")).toBe("Bold text and italic");
  });

  it("normalizes newlines and spaces", () => {
    expect(cleanSubtitleText("Line 1\nLine 2\n\nLine 3")).toBe("Line 1 Line 2 Line 3");
    expect(cleanSubtitleText("   Extra   spaces   ")).toBe("Extra spaces");
  });
});

describe("parseJson3Transcript", () => {
  it("parses JSON3 events into cues", () => {
    const mockJson = {
      events: [
        {
          tStartMs: 1200,
          dDurationMs: 3400,
          segs: [{ utf8: "Welcome to " }, { utf8: "HOARD &amp; Next.js" }],
        },
        {
          tStartMs: 5000,
          dDurationMs: 2000,
          segs: [{ utf8: "This is a second sentence." }],
        },
      ],
    };

    const cues = parseJson3Transcript(mockJson);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({
      text: "Welcome to HOARD & Next.js",
      startMs: 1200,
      durationMs: 3400,
      formattedTime: "00:01",
    });
    expect(cues[1]).toEqual({
      text: "This is a second sentence.",
      startMs: 5000,
      durationMs: 2000,
      formattedTime: "00:05",
    });
  });

  it("handles empty or invalid JSON", () => {
    expect(parseJson3Transcript(null)).toEqual([]);
    expect(parseJson3Transcript({})).toEqual([]);
    expect(parseJson3Transcript({ events: [] })).toEqual([]);
  });
});

describe("parseXmlTranscript", () => {
  it("parses XML timedtext into cues", () => {
    const xml = `
      <transcript>
        <text start="0.5" dur="2.1">First caption &amp; intro</text>
        <text start="3.0" dur="4.5">Second caption block</text>
      </transcript>
    `;

    const cues = parseXmlTranscript(xml);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({
      text: "First caption & intro",
      startMs: 500,
      durationMs: 2100,
      formattedTime: "00:00",
    });
    expect(cues[1]).toEqual({
      text: "Second caption block",
      startMs: 3000,
      durationMs: 4500,
      formattedTime: "00:03",
    });
  });

  it("handles empty or invalid XML", () => {
    expect(parseXmlTranscript("")).toEqual([]);
    expect(parseXmlTranscript("<xml></xml>")).toEqual([]);
  });
});

describe("selectBestCaptionTrack", () => {
  it("prioritizes manual English track over auto-generated", () => {
    const tracks = [
      { baseUrl: "https://auto.en", languageCode: "en", kind: "asr" },
      { baseUrl: "https://manual.en", languageCode: "en" },
      { baseUrl: "https://manual.es", languageCode: "es" },
    ];

    const chosen = selectBestCaptionTrack(tracks, "en");
    expect(chosen?.baseUrl).toBe("https://manual.en");
  });

  it("falls back to auto-generated English if manual not available", () => {
    const tracks = [
      { baseUrl: "https://manual.es", languageCode: "es" },
      { baseUrl: "https://auto.en", languageCode: "en", kind: "asr" },
    ];

    const chosen = selectBestCaptionTrack(tracks, "en");
    expect(chosen?.baseUrl).toBe("https://auto.en");
  });

  it("picks requested language if available", () => {
    const tracks = [
      { baseUrl: "https://manual.en", languageCode: "en" },
      { baseUrl: "https://manual.de", languageCode: "de" },
    ];

    const chosen = selectBestCaptionTrack(tracks, "de");
    expect(chosen?.baseUrl).toBe("https://manual.de");
  });
});

describe("fetchYouTubeTranscript", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches and parses transcript from HTML player response", async () => {
    const mockHtml = `
      <html>
        <head>
          <script>
            var ytInitialPlayerResponse = {
              "videoDetails": { "title": "Next.js 16 Deep Dive", "author": "Vercel" },
              "captions": {
                "playerCaptionsTracklistRenderer": {
                  "captionTracks": [
                    {
                      "baseUrl": "https://www.youtube.com/api/timedtext?v=test",
                      "name": { "simpleText": "English" },
                      "languageCode": "en"
                    }
                  ]
                }
              }
            };
          </script>
        </head>
      </html>
    `;

    const mockSubtitleJson = {
      events: [
        {
          tStartMs: 0,
          dDurationMs: 2500,
          segs: [{ utf8: "Welcome to Next.js 16 tutorial." }],
        },
        {
          tStartMs: 2500,
          dDurationMs: 3000,
          segs: [{ utf8: "We will cover Server Components and Turbopack." }],
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("watch?v=")) {
        return {
          ok: true,
          text: async () => mockHtml,
        } as any;
      }
      if (url.includes("timedtext")) {
        return {
          ok: true,
          text: async () => JSON.stringify(mockSubtitleJson),
        } as any;
      }
      return { ok: false } as any;
    });

    const result = await fetchYouTubeTranscript("https://www.youtube.com/watch?v=MP01GcI6J4A");
    expect(result).not.toBeNull();
    expect(result?.videoId).toBe("MP01GcI6J4A");
    expect(result?.title).toBe("Next.js 16 Deep Dive");
    expect(result?.author).toBe("Vercel");
    expect(result?.cues).toHaveLength(2);
    expect(result?.plainText).toBe(
      "Welcome to Next.js 16 tutorial. We will cover Server Components and Turbopack."
    );
    expect(result?.markdownWithTimestamps).toContain("[00:00] Welcome to Next.js 16 tutorial.");
    expect(result?.markdownWithTimestamps).toContain("[00:02] We will cover Server Components and Turbopack.");
    expect(result?.durationSec).toBe(6);
    expect(result?.wordCount).toBe(12);
  });

  it("fetches transcript using InnerTube player API when HTML player response has no captions", async () => {
    const mockHtmlWithoutCaptions = `<html><body>No captions in initial HTML</body></html>`;
    const mockInnerTubeJson = {
      videoDetails: { title: "InnerTube Fallback Video", author: "Tech Channel" },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              baseUrl: "https://www.youtube.com/api/timedtext?v=innertube",
              name: { simpleText: "English (auto-generated)" },
              languageCode: "en",
              kind: "asr",
            },
          ],
        },
      },
    };

    const mockSubtitleJson = {
      events: [
        {
          tStartMs: 1000,
          dDurationMs: 2000,
          segs: [{ utf8: "Fetched via InnerTube endpoint." }],
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("watch?v=")) {
        return { ok: true, text: async () => mockHtmlWithoutCaptions } as any;
      }
      if (url.includes("youtubei/v1/player")) {
        return { ok: true, json: async () => mockInnerTubeJson } as any;
      }
      if (url.includes("timedtext")) {
        return { ok: true, text: async () => JSON.stringify(mockSubtitleJson) } as any;
      }
      return { ok: false } as any;
    });

    const result = await fetchYouTubeTranscript("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).not.toBeNull();
    expect(result?.videoId).toBe("dQw4w9WgXcQ");
    expect(result?.title).toBe("InnerTube Fallback Video");
    expect(result?.isAutoGenerated).toBe(true);
    expect(result?.plainText).toBe("Fetched via InnerTube endpoint.");
  });

  it("returns metadata with empty cues when video has no captions", async () => {
    const mockHtml = `
      <html>
        <head>
          <script>
            var ytInitialPlayerResponse = {
              "videoDetails": { "title": "No Captions Video" }
            };
          </script>
        </head>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
      json: async () => ({}),
    } as any);

    const result = await fetchYouTubeTranscript("https://youtu.be/kCc8FmEb1nY");
    expect(result).not.toBeNull();
    expect(result?.title).toBe("No Captions Video");
    expect(result?.cues).toHaveLength(0);
  });
});
