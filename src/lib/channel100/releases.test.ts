import { describe, expect, it } from "vitest";
import {
  classifyReleasePeriod,
  parseTvMazeScheduleEntries,
  parseWikidataReleaseFilms,
  sortAndDedupeReleases,
} from "./releases";

describe("Streaming Release Calendar (day / week / month / year)", () => {
  const anchor = new Date("2026-11-15T12:00:00");

  it("classifies release dates into day, week, month, and year buckets", () => {
    expect(classifyReleasePeriod("2026-11-15", anchor)).toBe("day");
    expect(classifyReleasePeriod("2026-11-18", anchor)).toBe("week");
    expect(classifyReleasePeriod("2026-11-28", anchor)).toBe("month");
    expect(classifyReleasePeriod("2026-06-10", anchor)).toBe("year");
  });

  it("parses TVMaze web schedule entries across major streaming platforms", () => {
    const entries = [
      {
        airdate: "2026-11-15",
        season: 2,
        number: 5,
        name: "The Shift",
        runtime: 50,
        summary: "<p>A tense new chapter.</p>",
        _embedded: {
          show: {
            id: 901,
            name: "Severance",
            language: "English",
            genres: ["Sci-Fi", "Thriller"],
            rating: { average: 8.7 },
            webChannel: { name: "Apple TV+", country: { name: "United States" } },
            externals: { imdb: "tt11280740" },
          },
        },
      },
      {
        airdate: "2026-11-17",
        season: 1,
        number: 1,
        name: "Pilot",
        runtime: 45,
        _embedded: {
          show: {
            id: 902,
            name: "Local Unknown Show",
            webChannel: { name: "Obscure Local Channel" },
          },
        },
      },
    ];

    const parsed = parseTvMazeScheduleEntries(entries, anchor);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Severance");
    expect(parsed[0].where).toBe("Apple TV+");
    expect(parsed[0].releasePeriod).toBe("day");
    expect(parsed[0].customKind).toBe("tv");
  });

  it("parses Wikidata feature film releases and sorts/dedupes cleanly", () => {
    const wdJson = {
      results: {
        bindings: [
          {
            filmLabel: { value: "Winter Odyssey" },
            pubDate: { value: "2026-11-20T00:00:00Z" },
            directorLabel: { value: "Celine Song" },
            countryLabel: { value: "USA" },
            genreLabel: { value: "Drama" },
            duration: { value: "118" },
          },
        ],
      },
    };

    const films = parseWikidataReleaseFilms(wdJson, anchor);
    expect(films).toHaveLength(1);
    expect(films[0].releaseDate).toBe("2026-11-20");
    expect(films[0].releasePeriod).toBe("week");
    expect(films[0].customKind).toBe("film");

    const sorted = sortAndDedupeReleases([...films, ...films]);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].rank).toBe(1);
  });

  it("keeps only Hollywood (US/English) and Indian releases", () => {
    const tvEntries = [
      {
        airdate: "2026-11-15",
        season: 1,
        number: 1,
        _embedded: {
          show: {
            id: 1,
            name: "US Thriller",
            language: "English",
            webChannel: { name: "Netflix", country: { name: "United States" } },
          },
        },
      },
      {
        airdate: "2026-11-15",
        season: 1,
        number: 1,
        _embedded: {
          show: {
            id: 2,
            name: "Telugu Hit",
            language: "Telugu",
            webChannel: { name: "Aha", country: { name: "India" } },
          },
        },
      },
      {
        airdate: "2026-11-15",
        season: 1,
        number: 1,
        _embedded: {
          show: {
            id: 3,
            name: "Norwegian Reality",
            language: "Norwegian",
            webChannel: { name: "Max" },
          },
        },
      },
      {
        airdate: "2026-11-15",
        season: 1,
        number: 1,
        _embedded: {
          show: {
            id: 4,
            name: "Russian Show",
            language: "Russian",
            webChannel: { name: "YouTube" },
          },
        },
      },
      {
        airdate: "2026-11-15",
        season: 1,
        number: 1,
        _embedded: {
          show: {
            id: 5,
            name: "Spanish Drama",
            language: "Spanish",
            webChannel: { name: "Netflix" },
          },
        },
      },
      {
        airdate: "2026-11-15",
        season: 1,
        number: 1,
        _embedded: {
          show: {
            id: 6,
            name: "German Mystery",
            language: "German",
            webChannel: { name: "Netflix" },
          },
        },
      },
      {
        airdate: "2026-11-15",
        season: 1,
        number: 1,
        _embedded: {
          show: {
            id: 7,
            name: "Seoul Thriller",
            language: "Korean",
            webChannel: { name: "Netflix" },
          },
        },
      },
      {
        airdate: "2026-11-15",
        season: 1,
        number: 1,
        _embedded: {
          show: {
            id: 8,
            name: "Tokyo Series",
            language: "Japanese",
            webChannel: { name: "Crunchyroll" },
          },
        },
      },
    ];

    const tvParsed = parseTvMazeScheduleEntries(tvEntries, anchor);
    expect(tvParsed.map((i) => i.title)).toEqual([
      "US Thriller",
      "Telugu Hit",
      "Spanish Drama",
      "German Mystery",
      "Seoul Thriller",
      "Tokyo Series",
    ]);
    expect(tvParsed[1].lang).toBe("Telugu");
    expect(tvParsed[2].lang).toBe("Spanish");
    expect(tvParsed[3].lang).toBe("German");
    expect(tvParsed[4].lang).toBe("Korean");
    expect(tvParsed[5].lang).toBe("Japanese");

    const wdJson = {
      results: {
        bindings: [
          {
            filmLabel: { value: "Hollywood Blockbuster" },
            pubDate: { value: "2026-11-20T00:00:00Z" },
            countryLabel: { value: "United States of America" },
            langLabel: { value: "English" },
          },
          {
            filmLabel: { value: "Malayalam Cinema" },
            pubDate: { value: "2026-11-21T00:00:00Z" },
            countryLabel: { value: "India" },
            langLabel: { value: "Malayalam" },
          },
          {
            filmLabel: { value: "French Indie" },
            pubDate: { value: "2026-11-22T00:00:00Z" },
            countryLabel: { value: "France" },
            langLabel: { value: "French" },
          },
        ],
      },
    };

    const wdParsed = parseWikidataReleaseFilms(wdJson, anchor);
    expect(wdParsed.map((i) => i.title)).toEqual([
      "Hollywood Blockbuster",
      "Malayalam Cinema",
    ]);
    expect(wdParsed[1].lang).toBe("Malayalam");
  });
});

