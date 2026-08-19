import { describe, expect, it } from "vitest";
import { inferItemType } from "./inferItemType";

describe("inferItemType", () => {
  it("classifies ART, VID, PPR as QUEUED", () => {
    expect(inferItemType("ART")).toBe("QUEUED");
    expect(inferItemType("VID")).toBe("QUEUED");
    expect(inferItemType("PPR")).toBe("QUEUED");
  });

  it("classifies GIT, APP, DOC, PLY as REFERENCE", () => {
    expect(inferItemType("GIT")).toBe("REFERENCE");
    expect(inferItemType("APP")).toBe("REFERENCE");
    expect(inferItemType("DOC")).toBe("REFERENCE");
    expect(inferItemType("PLY")).toBe("REFERENCE");
  });
});
