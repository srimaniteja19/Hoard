import { describe, expect, it } from "vitest";
import { matchPiece, matchSeries, parseStudioPaste, pastePatch, PASTE_FIELDS, toStudioBlock } from "./paste";
import { placePiece } from "./series";

const BLOCK = `Here you go.

=== STUDIO ===
Title: Prediction Markets P3: How sports turned it into a money machine
Series: Prediction Markets
Part: 3
Format: Reel
Topic: Finance
Status: Ready

## Script
Prediction markets found their money machine, and it isn't elections. It's sports.
[cards: MONEY MACHINE / IT'S SPORTS]

Pause and guess: how big did it get? This July, 53 billion.
[cards: PAUSE & GUESS / JULY 2026: $53B]

Please follow and share for more interesting, random content like this.

## Caption
Prediction Markets, Part 3.
Sources: Pew Research Center, TRM Labs
Part 4 next: who actually profits.

## Instagram hashtags
#predictionmarkets #kalshi #sportsbetting #worldcup #oddlyinteresting

## TikTok / YouTube hashtags
#predictionmarkets #kalshi #polymarket #shorts

## Sources
- [Pew Research Center: volume doubled](https://www.pewresearch.org/short-reads/x)
- TRM Labs: https://www.trmlabs.com/y
- https://www.covers.com/z

## Notes
Paper theme. Cover at 26s.
=== END ===
thanks`;

describe("parseStudioPaste: Studio block", () => {
  const p = parseStudioPaste(BLOCK);
  it("reads the meta lines", () => {
    expect(p.title).toBe("Prediction Markets P3: How sports turned it into a money machine");
    expect(p).toMatchObject({ seriesTitle: "Prediction Markets", part: 3, format: "reel", pillar: "finance", status: "ready" });
  });
  it("splits scenes and title cards", () => {
    expect(p.script).toHaveLength(3);
    expect(p.script![0].cards).toEqual(["MONEY MACHINE", "IT'S SPORTS"]);
    expect(p.script![1].text).toBe("Pause and guess: how big did it get? This July, 53 billion.");
  });
  it("keeps caption lines that look like labels", () => {
    expect(p.caption).toBe("Prediction Markets, Part 3.\nSources: Pew Research Center, TRM Labs\nPart 4 next: who actually profits.");
  });
  it("sorts both hashtag sets", () => {
    expect(p.hashtags!.split(" ")).toHaveLength(5);
    expect(p.extraHashtags).toBe("#predictionmarkets #kalshi #polymarket #shorts");
  });
  it("reads every source style", () => {
    expect(p.sources).toEqual([
      { title: "Pew Research Center: volume doubled", url: "https://www.pewresearch.org/short-reads/x" },
      { title: "TRM Labs", url: "https://www.trmlabs.com/y" },
      { title: "covers.com", url: "https://www.covers.com/z" },
    ]);
    expect(p.notes).toBe("Paper theme. Cover at 26s.");
  });
});

const REPLY = `I've made Part 3. It's 51 seconds.

**What's in it:**
- **Cold open:** an election contract gets crossed out.

**Jeff script** (for ElevenLabs "Jeff - Social Media")
> Prediction markets found their money machine, and it isn't elections. It's sports.
> Pause and guess: how big did it get? (pause about 1 second) This July, 53 billion.
> Please follow and share for more interesting, random content like this.

Leave about a 1-second pause after "how big did it get?" so the countdown lands.

**Caption**
> Prediction Markets, Part 3: how sports turned a nerdy idea into a money machine.
> Would you trade the Super Bowl?
> Sources: Pew Research Center, TRM Labs

**Instagram (5):** #predictionmarkets #kalshi #sportsbetting #worldcup #oddlyinteresting

**TikTok / YouTube:** #predictionmarkets #kalshi #polymarket #robinhood #shorts

Sources:
- [Pew Research Center](https://www.pewresearch.org/a)
- [Covers: Kalshi launches](https://www.covers.com/b)

Files:
- reel-prediction-markets-part3.mp4`;

describe("parseStudioPaste: a Claude reply", () => {
  const p = parseStudioPaste(REPLY, { seriesTitles: ["Prediction Markets", "Other"] });
  it("takes quoted script lines as scenes and drops pause notes", () => {
    expect(p.script!.map((s) => s.text)).toEqual([
      "Prediction markets found their money machine, and it isn't elections. It's sports.",
      "Pause and guess: how big did it get? This July, 53 billion.",
      "Please follow and share for more interesting, random content like this.",
    ]);
  });
  it("gets the caption, tags and sources, and skips the file list", () => {
    expect(p.caption!.split("\n")).toHaveLength(3);
    expect(p.hashtags).toBe("#predictionmarkets #kalshi #sportsbetting #worldcup #oddlyinteresting");
    expect(p.extraHashtags).toContain("#robinhood");
    expect(p.sources).toHaveLength(2);
    expect(p.notes).toContain("Cold open");
  });
  it("finds a known series and part in the text", () => {
    expect(p).toMatchObject({ seriesTitle: "Prediction Markets", part: 3 });
  });
});

describe("other inputs", () => {
  it("reads JSON", () => {
    const p = parseStudioPaste(JSON.stringify({ title: "T", series: "Prediction Markets · Part 4", script: ["One.", "Two."], instagram: ["a", "#b"], sources: ["https://x.com/p"] }));
    expect(p).toMatchObject({ title: "T", seriesTitle: "Prediction Markets", part: 4, hashtags: "#a #b" });
    expect(p.script).toHaveLength(2);
    expect(p.sources![0]).toEqual({ title: "x.com", url: "https://x.com/p" });
  });
  it("splits one long hashtag list into Instagram 5 and the long set", () => {
    const p = parseStudioPaste("## Hashtags\n#a #b #c #d #e #f #g");
    expect(p.hashtags).toBe("#a #b #c #d #e");
    expect(p.extraHashtags).toBe("#a #b #c #d #e #f #g");
  });
  it("moves a trailing hashtag line out of the caption", () => {
    const p = parseStudioPaste("## Caption\nHello there.\n\n#one #two");
    expect(p).toMatchObject({ caption: "Hello there.", hashtags: "#one #two" });
  });
  it("round-trips a piece through a Studio block", () => {
    const piece = {
      title: "A piece",
      status: "making" as const,
      format: "carousel" as const,
      pillar: "tech" as const,
      part: 2,
      script: [{ text: "First scene.", cards: ["ONE"] }, { text: "Second scene.", cards: [] }],
      caption: "Line one.\n\nLine two.",
      hashtags: "#a #b",
      extraHashtags: "#a #b #c",
      sources: [{ title: "Site", url: "https://site.com" }, { title: "Book" }],
      notes: "Note.",
      coverUrl: null,
    };
    const back = parseStudioPaste(toStudioBlock(piece, "My Series"));
    expect(pastePatch(back, PASTE_FIELDS)).toEqual({
      title: "A piece",
      status: "making",
      format: "carousel",
      pillar: "tech",
      script: piece.script,
      caption: piece.caption,
      hashtags: "#a #b",
      extraHashtags: "#a #b #c",
      sources: piece.sources,
      notes: "Note.",
    });
    expect(back).toMatchObject({ seriesTitle: "My Series", part: 2 });
  });
});

describe("routing", () => {
  const series = [
    { id: "s1", title: "Prediction Markets", nextPart: 3, parts: [{ n: 1, title: "a", pieceId: "p1" }, { n: 2, title: "b", pieceId: "p2" }, { n: 3, title: "c", pieceId: "p3" }, { n: 4, title: "d", pieceId: null }] },
  ];
  const pieces = [
    { id: "p1", title: "PM Part 1", seriesId: "s1", part: 1 },
    { id: "p3", title: "PM Part 3", seriesId: "s1", part: 3 },
    { id: "x", title: "The tontine", seriesId: null, part: null },
  ];
  it("matches series loosely and pieces by part, then title", () => {
    expect(matchSeries(series, "prediction markets")?.id).toBe("s1");
    expect(matchSeries(series, "Prediction Markets series")?.id).toBe("s1");
    expect(matchPiece(pieces, series[0], { part: 3 })?.id).toBe("p3");
    expect(matchPiece(pieces, null, { title: "the Tontine" })?.id).toBe("x");
    expect(matchPiece(pieces, series[0], { part: 4 })).toBeNull();
  });
  it("places a piece in its part and moves next along when done", () => {
    const r = placePiece(series[0].parts, { id: "new", title: "d" }, 4, 4, true);
    expect(r.part).toBe(4);
    expect(r.parts.find((p) => p.n === 4)?.pieceId).toBe("new");
    expect(r.nextPart).toBe(5);
    const same = placePiece(series[0].parts, { id: "p3", title: "c" }, 3, 3, true);
    expect(same).toMatchObject({ part: 3, nextPart: 4 });
    const taken = placePiece(series[0].parts, { id: "new", title: "zz" }, 2, 3, false);
    expect(taken).toMatchObject({ part: 5, nextPart: 3 });
  });
});
