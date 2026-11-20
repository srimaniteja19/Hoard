import { describe, it, expect } from "vitest";
import {
  buildLetterboxdUrl,
  formatWikidataGenre,
  parseWikipediaReceptionReviews,
} from "./reviewsParser";

describe("reviewsParser", () => {
  it("extracts attributed critic review quotes and ratings from Wikipedia reception HTML", () => {
    const html = `
      <p><i>The Times of India</i> gave a review stating "Chandrasekhar Yeleti needs to be applauded for his tryst of an adventurous film – something that's unique in Telugu films."<sup>[1]</sup>
      <i>Idlebrain.com</i> gave a review of rating 4/5 stating "I am giving it a rating of 4 for the guts of producers who came forward to make a different film and for the conviction of director."<sup>[2]</sup>
      <i>123telugu.com</i> rated it 3.25/5 and wrote "Sahasam is not your average Telugu cinema. The plot, the setting and the execution are very fresh and novel."<sup>[3]</sup></p>
    `;

    const reviews = parseWikipediaReceptionReviews(html, 4);
    expect(reviews).toHaveLength(3);
    expect(reviews[0].author).toBe("The Times of India");
    expect(reviews[0].text).toContain("Chandrasekhar Yeleti");
    expect(reviews[1].author).toBe("Idlebrain.com");
    expect(reviews[1].rating).toBe("4/5");
    expect(reviews[2].author).toBe("123telugu.com");
    expect(reviews[2].rating).toBe("3.25/5");
  });

  it("builds direct Letterboxd review URL when Wikidata slug is known, and search fallback otherwise", () => {
    expect(buildLetterboxdUrl("Sahasam", "sahasam")).toBe(
      "https://letterboxd.com/film/sahasam/reviews/by/activity/"
    );
    expect(buildLetterboxdUrl("Sahasam")).toBe(
      "https://letterboxd.com/search/films/Sahasam/"
    );
  });

  it("formats Wikidata genre strings cleanly", () => {
    expect(formatWikidataGenre(["action film", "treasure hunt film"])).toBe(
      "Action, Treasure hunt"
    );
  });
});
