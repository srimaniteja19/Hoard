import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    update: () => ({
      set: () => ({
        where: async () => [],
      }),
    }),
  },
}));

import { ingestOgCoverForBookmark } from "./ogPipeline";

describe("ingestOgCoverForBookmark (§5 Pipeline Decision Tree)", () => {
  it("processes invalid URL gracefully returning REJECTED / FAILED status", async () => {
    const res = await ingestOgCoverForBookmark(999999, "invalid-url", "ART");
    expect(res.status).toMatch(/REJECTED|FAILED/);
    expect(res.rejectReason).toBeDefined();
  });
});
