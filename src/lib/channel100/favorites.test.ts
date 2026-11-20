import { describe, it, expect } from "vitest";
import {
  createDefaultFavoritesVault,
  decodeVaultFromHash,
  encodeVaultToHash,
  filterFavoritesByScope,
  formatFavoritesForShare,
  isItemInFavorites,
} from "./favorites";
import { FavoriteItem, FavoritesVault } from "./types";

const SAMPLE_ITEMS: FavoriteItem[] = [
  {
    id: "f1",
    title: "Parasite",
    mediaType: "movie",
    year: 2019,
    creator: "Bong Joon-ho",
    genre: "Thriller",
    where: "Hulu",
    pitch: "Every single frame is a masterclass in tension.",
    vibe: "Pure Cinema",
    rating: 5,
    hours: 2.2,
    addedAt: 1000,
  },
  {
    id: "s1",
    title: "Breaking Bad",
    mediaType: "show",
    year: "2008–2013",
    creator: "AMC",
    genre: "Crime",
    where: "Netflix",
    pitch: "The greatest character arc on television.",
    vibe: "Masterclass",
    rating: 5,
    hours: 50,
    addedAt: 2000,
  },
];

describe("channel100 favorites", () => {
  it("filters by media scope (all, movie, show)", () => {
    expect(filterFavoritesByScope(SAMPLE_ITEMS, "all")).toHaveLength(2);
    expect(filterFavoritesByScope(SAMPLE_ITEMS, "movie").map((i) => i.title)).toEqual([
      "Parasite",
    ]);
    expect(filterFavoritesByScope(SAMPLE_ITEMS, "show").map((i) => i.title)).toEqual([
      "Breaking Bad",
    ]);
  });

  it("matches favorites by id or normalized title", () => {
    const vault: FavoritesVault = {
      ...createDefaultFavoritesVault(),
      items: SAMPLE_ITEMS,
    };
    expect(isItemInFavorites(vault, "f1")).toBe(true);
    expect(isItemInFavorites(vault, "other", "Parasite (2019)")).toBe(true);
    expect(isItemInFavorites(vault, "other", "The Wire")).toBe(false);
  });

  it("formats shareable lists in clean, compact, and markdown modes", () => {
    const vault: FavoritesVault = {
      items: SAMPLE_ITEMS,
      profile: {
        displayName: "Mani's Canon",
        tagline: "Start here.",
        isPublic: true,
      },
      updatedAt: 3000,
    };

    const cleanMovies = formatFavoritesForShare(vault, "movie", "clean", "https://example.com/share");
    expect(cleanMovies).toContain("All-Time Favorite Movies");
    expect(cleanMovies).toContain("Parasite (2019)");
    expect(cleanMovies).not.toContain("Breaking Bad");
    expect(cleanMovies).toContain("https://example.com/share");

    const mdAll = formatFavoritesForShare(vault, "all", "markdown");
    expect(mdAll).toContain("## All-Time Movies (1)");
    expect(mdAll).toContain("## All-Time Shows (1)");

    const compact = formatFavoritesForShare(vault, "all", "compact");
    expect(compact).toContain("1. Parasite (2019) [Film]");
    expect(compact).toContain("2. Breaking Bad (2008–2013) [TV]");
  });

  it("round-trips vault through compact URL hash codec", () => {
    const vault: FavoritesVault = {
      items: SAMPLE_ITEMS,
      profile: {
        displayName: "Desert Island List",
        tagline: "My top picks",
        isPublic: true,
      },
      updatedAt: 3000,
    };

    const encoded = encodeVaultToHash(vault, "all");
    const decoded = decodeVaultFromHash(`#d=${encoded}`);
    expect(decoded).not.toBeNull();
    expect(decoded?.profile.displayName).toBe("Desert Island List");
    expect(decoded?.items).toHaveLength(2);
    expect(decoded?.items[0].title).toBe("Parasite");
    expect(decoded?.items[1].mediaType).toBe("show");
  });
});
