import { describe, expect, it } from "vitest";
import { buildPersonalLogItems, normalizePersonalLogKey } from "./storage";
import { Channel100Store, ChannelMediaItem } from "./types";

describe("Personal Log unification & deduplication", () => {
  it("moves items marked 'seen' from any list into Personal Log and keeps only one copy of duplicates", () => {
    const tvList: ChannelMediaItem[] = [
      {
        kind: "tv",
        id: "s1",
        rank: 1,
        title: "Breaking Bad",
        years: "2008–2013",
        start: 2008,
        network: "AMC",
        where: "Netflix",
        genre: "Crime",
        imdb: 9.5,
        icon: "flask",
        blurb: "Chemistry teacher.",
        mins: 49,
        sub: "Crime",
        hours: 51,
      },
    ];

    const filmList: ChannelMediaItem[] = [
      {
        kind: "film",
        id: "f1",
        rank: 1,
        title: "Parasite",
        year: 2019,
        start: 2019,
        director: "Bong Joon-ho",
        where: "Max",
        genre: "Thriller",
        imdb: 8.5,
        icon: "house",
        blurb: "Class satire.",
        mins: 132,
        sub: "Thriller",
        hours: 2.2,
      },
    ];

    const vgfList: ChannelMediaItem[] = [
      {
        kind: "vgf",
        id: "vgf_parasite_2019",
        rank: 1,
        title: "Parasite (2019)",
        year: 2019,
        start: 2019,
        director: "Bong Joon-ho",
        where: "Hulu",
        genre: "Thriller",
        imdb: 8.5,
        icon: "house",
        blurb: "Duplicate across lists.",
        mins: 132,
        sub: "Thriller",
        hours: 2.2,
      },
      {
        kind: "vgf",
        id: "vgf_aftersun_2022",
        rank: 2,
        title: "Aftersun",
        year: 2022,
        start: 2022,
        director: "Charlotte Wells",
        where: "MUBI",
        genre: "Drama",
        imdb: 7.6,
        icon: "sun",
        blurb: "Father-daughter holiday.",
        mins: 102,
        sub: "Drama",
        hours: 1.7,
      },
    ];

    const store: Channel100Store = {
      shows: {
        s1: { s: "seen", updatedAt: 1000 },
        f1: { s: "seen", updatedAt: 2000 },
        vgf_parasite_2019: { s: "seen", updatedAt: 2500 },
        vgf_aftersun_2022: { s: "want", updatedAt: 3000 }, // not seen -> should not move
      },
      custom: {
        c_1: {
          id: "c_1",
          title: "Breaking Bad", // duplicates s1 -> keep custom once only
          kind: "tv",
          lang: "English",
          status: "seen",
          rating: 5,
          where: "Netflix",
          genre: "Crime",
          updatedAt: 500,
        },
        c_2: {
          id: "c_2",
          title: "Breaking Bad", // older duplicate custom entry -> drop
          kind: "tv",
          lang: "English",
          status: "seen",
          rating: 4,
          where: "Netflix",
          genre: "Crime",
          updatedAt: 100,
        },
      },
      updated: 3000,
    };

    expect(normalizePersonalLogKey("Parasite (2019)")).toBe("parasite");

    const logItems = buildPersonalLogItems(store, [tvList, filmList, vgfList]);
    // Should contain exactly 2 unique titles: Breaking Bad (from c_1) and Parasite (from f1)
    expect(logItems).toHaveLength(2);
    expect(logItems.map((i) => i.title)).toEqual(["Breaking Bad", "Parasite"]);
    expect(logItems[0].id).toBe("c_1");
    expect(logItems[1].id).toBe("f1");
  });
});

