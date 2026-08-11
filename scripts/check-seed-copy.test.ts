import { describe, it, expect } from "vitest";
import { KNOWN_SEED_STRINGS } from "./purge-seed-copy";

describe("Seed copy checker rules", () => {
  it("defines all 7 forbidden design-doc seed sentences", () => {
    expect(KNOWN_SEED_STRINGS.length).toBe(7);
    expect(KNOWN_SEED_STRINGS).toContain(
      "Tools and apps skip the reading queue and land on a shelf you check when setting up a machine."
    );
    expect(KNOWN_SEED_STRINGS).toContain(
      "Full text is archived at save time so the article outlives the site."
    );
    expect(KNOWN_SEED_STRINGS).toContain(
      "Stars and last-commit refresh on a schedule, so an abandoned repo tells you it's abandoned."
    );
  });
});
