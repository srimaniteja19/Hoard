import { describe, expect, it } from "vitest";
import {
  buildVeryGoodFilmsCatalog,
  parseVeryGoodFilmsHtml,
  parseVeryGoodFilmsWpJson,
  slugifyVgfId,
} from "./verygoodfilms";

describe("Very Good Films live catalog integration", () => {
  it("generates deterministic vgf_ IDs from title and year", () => {
    expect(slugifyVgfId("Breathless (À bout de souffle)", 1960)).toBe(
      "vgf_breathless_a_bout_de_souffle_1960"
    );
  });

  it("parses WordPress REST API posts/films into RawVgfEntry objects", () => {
    const mockWpJson = [
      {
        title: { rendered: "La Chimera (2023)" },
        content: {
          rendered:
            "<p>Directed by Alice Rohrwacher. Country: Italy. Genre: Drama / Fantasy. Recommended by Beth Wilkinson.</p>",
        },
        link: "https://verygoodfilms.co/films/la-chimera/",
        acf: {
          where_to_watch: "MUBI / Hulu",
        },
      },
    ];

    const parsed = parseVeryGoodFilmsWpJson(mockWpJson);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("La Chimera");
    expect(parsed[0].year).toBe(2023);
    expect(parsed[0].director).toBe("Alice Rohrwacher");
    expect(parsed[0].country).toBe("Italy");
    expect(parsed[0].where).toBe("MUBI / Hulu");
    expect(parsed[0].recommendedBy).toBe("Beth Wilkinson");
  });

  it("parses HTML catalogue rows and merges live entries ahead of the seed list", () => {
    const sampleHtml = `
      <div class="catalogue-list">
        <article class="film-item">
          <h3 class="film-title">Anatomy of a Fall</h3>
          <span class="film-year">2023</span>
          <span class="film-director">Justine Triet</span>
          <span class="film-country">France</span>
          <span class="film-genre">Courtroom Thriller</span>
          <span class="film-watch">Hulu / Apple TV</span>
          <p>A gripping psychological dissection in the French Alps. Recommended by Emma Stevenson</p>
        </article>
      </div>
    `;

    const htmlParsed = parseVeryGoodFilmsHtml(sampleHtml);
    expect(htmlParsed).toHaveLength(1);
    expect(htmlParsed[0].title).toBe("Anatomy of a Fall");
    expect(htmlParsed[0].director).toBe("Justine Triet");

    const catalog = buildVeryGoodFilmsCatalog(htmlParsed);
    expect(catalog[0].title).toBe("Anatomy of a Fall");
    expect(catalog[0].id).toBe("vgf_anatomy_of_a_fall_2023");
    expect(catalog[0].lang).toBe("French");
    expect(catalog[0].langFlag).toBe("🇫🇷");
    expect(catalog.length).toBeGreaterThan(30);
  });
});

