import { describe, expect, it } from "vitest";
import fixtures from "./__fixtures__/parse.json";
import { parseAtlas } from "./parse";
import type { AtlasCadence, AtlasDepth } from "./types";

describe("parseAtlas", () => {
  it.each(fixtures)("$name", ({ input, chips, expected }) => {
    expect(
      parseAtlas(input, chips as { depth?: AtlasDepth; cadence?: AtlasCadence; antiScope?: string }),
    ).toEqual(expected);
  });
});

