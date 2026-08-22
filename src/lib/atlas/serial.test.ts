import { describe, expect, it } from "vitest";
import { atlasSerial } from "./serial";

it("uses ATL- plus first 4 hex chars uppercased", () => {
  expect(atlasSerial("a1b2c3d4-xxxx")).toBe("ATL-A1B2");
});
