import { describe, expect, it } from "vitest";
import {
  mergeCatalogItems,
  parseImdbChartHtml,
  parseLetterboxdListHtml,
  parseTvMazeShows,
  parseWikidataFilmsJson,
} from "./liveCatalogs";

describe("liveCatalogs parsers (IMDb Top 250 TV & Letterboxd 500)", () => {
  it("parses IMDb __NEXT_DATA__ chart payload into TV items", () => {
    const html = `
      <html><body>
        <script id="__NEXT_DATA__" type="application/json">
          ${JSON.stringify({
            props: {
              pageProps: {
                pageData: {
                  chartTitles: {
                    edges: [
                      {
                        currentRank: 1,
                        node: {
                          id: "tt0903747",
                          titleText: { text: "Breaking Bad" },
                          releaseYear: { year: 2008, endYear: 2013 },
                          ratingsSummary: { aggregateRating: 9.5 },
                          titleGenres: {
                            genres: [
                              { genre: { text: "Crime" } },
                              { genre: { text: "Drama" } },
                            ],
                          },
                          plot: {
                            plotText: {
                              plainText:
                                "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.",
                            },
                          },
                          episodes: { episodes: { total: 62 } },
                          runtime: { seconds: 2940 },
                        },
                      },
                    ],
                  },
                },
              },
            },
          })}
        </script>
      </body></html>
    `;

    const items = parseImdbChartHtml(html, "tv");
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("tv_tt0903747");
    expect(items[0].title).toBe("Breaking Bad");
    expect(items[0].years).toBe("2008–2013");
    expect(items[0].imdb).toBe(9.5);
    expect(items[0].eps).toBe(62);
  });

  it("parses TVMaze API shows and sorts by rating descending", () => {
    const mockShows = [
      {
        id: 1,
        name: "Show B",
        premiered: "2019-01-01",
        status: "Running",
        rating: { average: 8.4 },
        genres: ["Sci-Fi"],
        averageRuntime: 55,
        externals: { imdb: "tt1111111" },
      },
      {
        id: 2,
        name: "Show A",
        premiered: "2015-05-10",
        ended: "2020-08-01",
        status: "Ended",
        rating: { average: 9.2 },
        genres: ["Drama", "Thriller"],
        network: { name: "HBO", country: { name: "United States" } },
        averageRuntime: 60,
        externals: { imdb: "tt2222222" },
      },
    ];

    const parsed = parseTvMazeShows(mockShows, 250);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].title).toBe("Show A");
    expect(parsed[0].id).toBe("tv_tt2222222");
    expect(parsed[0].imdb).toBe(9.2);
    expect(parsed[1].title).toBe("Show B");
  });

  it("parses Letterboxd list HTML and Wikidata SPARQL JSON and merges up to 500 items", () => {
    const lbHtml = `
      <ul>
        <li class="poster-container" data-film-slug="harakiri" data-item-name="Harakiri (1962)">
          <img alt="Harakiri" />
        </li>
      </ul>
    `;
    const lbItems = parseLetterboxdListHtml([lbHtml], 500);
    expect(lbItems).toHaveLength(1);
    expect(lbItems[0].id).toBe("lb_harakiri");
    expect(lbItems[0].title).toBe("Harakiri");
    expect(lbItems[0].year).toBe(1962);

    const wdJson = {
      results: {
        bindings: [
          {
            filmLabel: { value: "Seven Samurai" },
            lbId: { value: "seven-samurai" },
            imdbId: { value: "tt0047478" },
            year: { value: "1954" },
            directorLabel: { value: "Akira Kurosawa" },
            countryLabel: { value: "Japan" },
            genreLabel: { value: "Action" },
            duration: { value: "207" },
          },
        ],
      },
    };
    const wdItems = parseWikidataFilmsJson(wdJson, 500);
    expect(wdItems).toHaveLength(1);
    expect(wdItems[0].title).toBe("Seven Samurai");
    expect(wdItems[0].lang).toBe("Japanese");
    expect(wdItems[0].langFlag).toBe("🇯🇵");

    const merged = mergeCatalogItems([lbItems, wdItems], 500);
    expect(merged).toHaveLength(2);
    expect(merged[0].rank).toBe(1);
    expect(merged[1].rank).toBe(2);
  });
});

