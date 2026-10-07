import { describe, expect, it } from "vitest";
import { matchPiece, matchSeries, parseSeriesPaste, parseStudioPaste, pastePatch, PASTE_FIELDS, toStudioBlock } from "./paste";
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

describe("parseSeriesPaste", () => {
  const USER_PASTE = `Series:
### 1. 👽 Ben 10

“Remember when one watch could turn you into TEN different aliens? 👽”

Yep… **Ben 10.**

The original series premiered in 2005 and became one of Cartoon Network’s biggest shows.

Ben had the Omnitrix, Grandpa Max, Gwen… and somehow managed to save the world while still being a complete menace. 😂

---

### 2. ⚡ Power Rangers

“If you grew up watching Power Rangers, you probably wanted to yell this at least once…”

**“IT'S MORPHIN TIME!” ⚡**

Power Rangers became a massive childhood phenomenon with colorful suits, ridiculous monsters, and the ultimate childhood toy…

---

### 3. 🐉 Dragon Ball Z

“Forget homework. We had something much more important to do…”

**WATCH GOKU TURN SUPER SAIYAN.** 🔥

---

### 4. ⚡ Pokémon

“This is probably the most painful Pokémon news for an entire generation…”

After **25 YEARS**, Ash Ketchum finally became a Pokémon World Champion.

---

### 5. 👻 Danny Phantom

“Danny Phantom was basically every kid's dream…”

---

### 6. 🦸 Teen Titans

“This wasn't just a cartoon. This was peak childhood.”

---

### 7. 🐕 Courage the Cowardly Dog

“Who thought giving children existential horror was a good idea?” 💀

---

### 8. 🥷 Ninja Hattori

“If you grew up in India, you probably heard this name before you even knew what a ninja was…”

---

### 9. 😈 Shinchan

“Here's a childhood show you probably thought was gone…”

---

### 10. 🔵 Doraemon

“Imagine having a robot from the future who could solve literally every problem…”

Doraemon. 🔵`;

  it("detects and parses 10 parts from the user's markdown format", () => {
    const s = parseSeriesPaste(USER_PASTE);
    expect(s).not.toBeNull();
    expect(s!.parts).toHaveLength(10);
    expect(s!.parts[0].n).toBe(1);
    expect(s!.parts[0].title).toBe("👽 Ben 10");
    expect(s!.parts[0].hook).toContain("Remember when one watch could turn you into TEN different aliens?");
    expect(s!.parts[0].script!.length).toBeGreaterThan(2);

    expect(s!.parts[1].n).toBe(2);
    expect(s!.parts[1].title).toBe("⚡ Power Rangers");

    expect(s!.parts[9].n).toBe(10);
    expect(s!.parts[9].title).toBe("🔵 Doraemon");
    expect(s!.pillar).toBe("world");
  });

  it("parses series with explicit series title", () => {
    const text = `Series: 90s Cartoon Nostalgia

Part 1: Ben 10
Alien watch story.

Part 2: Power Rangers
Morphin time.`;
    const s = parseSeriesPaste(text);
    expect(s).not.toBeNull();
    expect(s!.title).toBe("90s Cartoon Nostalgia");
    expect(s!.parts).toHaveLength(2);
    expect(s!.parts[0].title).toBe("Ben 10");
    expect(s!.parts[1].title).toBe("Power Rangers");
  });

  it("parses simple numbered list with paragraphs", () => {
    const text = `1. The Hook
Capture attention in 3 seconds.

2. The Story
Tell the conflict and transformation.

3. The Call to Action
Ask them to follow.`;
    const s = parseSeriesPaste(text);
    expect(s).not.toBeNull();
    expect(s!.parts).toHaveLength(3);
    expect(s!.parts[0].title).toBe("The Hook");
    expect(s!.parts[1].title).toBe("The Story");
    expect(s!.parts[2].title).toBe("The Call to Action");
  });

  it("parses bold episode headers", () => {
    const text = `**Episode 1: The Matrix**
Red pill or blue pill.

**Episode 2: Inception**
Dream within a dream.`;
    const s = parseSeriesPaste(text);
    expect(s).not.toBeNull();
    expect(s!.parts).toHaveLength(2);
    expect(s!.parts[0].title).toBe("The Matrix");
    expect(s!.parts[1].title).toBe("Inception");
  });

  it("parses JSON series array", () => {
    const json = JSON.stringify([
      { part: 1, title: "Ep 1", script: "Scene one.\n\nScene two." },
      { part: 2, title: "Ep 2", script: "Another scene." },
    ]);
    const s = parseSeriesPaste(json);
    expect(s).not.toBeNull();
    expect(s!.parts).toHaveLength(2);
    expect(s!.parts[0].title).toBe("Ep 1");
    expect(s!.parts[0].script).toHaveLength(2);
  });

  it("returns null for a regular single piece paste", () => {
    const singlePiece = `=== STUDIO ===
Title: Single piece
Format: reel
Topic: finance

## Script
Just one script here.`;
    expect(parseSeriesPaste(singlePiece)).toBeNull();
  });
});
