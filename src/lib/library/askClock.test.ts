import { describe, expect, it } from "vitest";
import { addDaysIso, relativeRangeHint, wireRecencyFilter, wireSearchPrompt } from "./askClock";

describe("relativeRangeHint", () => {
  it("expands last N days to an inclusive ISO range ending today", () => {
    expect(relativeRangeHint("Compare Bitcoin prices for the last 10 days.", "2026-08-21")).toBe(
      "That means 2026-08-12 through 2026-08-21 inclusive."
    );
    expect(addDaysIso("2026-08-21", -9)).toBe("2026-08-12");
  });
});

describe("wireRecencyFilter", () => {
  it("keeps price windows from drifting into older months", () => {
    expect(wireRecencyFilter("weather in SF today")).toBe("day");
    expect(wireRecencyFilter("last 10 days of bitcoin")).toBe("month");
    expect(wireRecencyFilter("last 3 days")).toBe("week");
  });
});

describe("wireSearchPrompt", () => {
  it("pins today so the search model cannot invent July", () => {
    const prompt = wireSearchPrompt("Compare Bitcoin prices for the last 10 days.", {
      iso: "2026-08-21",
      label: "Friday, August 21, 2026",
    });
    expect(prompt).toContain("Friday, August 21, 2026 (2026-08-21)");
    expect(prompt).toContain("2026-08-12 through 2026-08-21");
    expect(prompt).toContain("Compare Bitcoin prices for the last 10 days.");
  });
});
