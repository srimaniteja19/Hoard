import { describe, it, expect } from "vitest";
import { getOrFetchFaviconForHost } from "./faviconService";

describe("getOrFetchFaviconForHost (§3.5 Favicons companion)", () => {
  it("returns null for empty or invalid host", async () => {
    expect(await getOrFetchFaviconForHost("")).toBeNull();
  });
});
