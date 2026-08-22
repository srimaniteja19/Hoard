import { describe, expect, it } from "vitest";
import fixtures from "./__fixtures__/parse.json";
import { parseAtlas } from "./parse";

describe("parseAtlas", () => {
  it.each(fixtures)("$name", ({ input, chips, expected }) => {
    expect(parseAtlas(input, chips)).toEqual(expected);
  });
});
