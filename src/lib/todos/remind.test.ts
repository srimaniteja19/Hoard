import { describe, expect, it } from "vitest";
import { localTimeValue, remindIsoFromLocal } from "./remind";

describe("localTimeValue", () => {
  it("returns an empty string when there is no reminder", () => {
    expect(localTimeValue(null)).toBe("");
  });

  it("reads the browser-local HH:mm from an ISO instant", () => {
    const iso = new Date(2026, 7, 21, 15, 30, 0).toISOString();
    expect(localTimeValue(iso)).toBe("15:30");
  });
});

describe("remindIsoFromLocal", () => {
  it("returns null when the time is empty", () => {
    expect(remindIsoFromLocal("2026-08-21", "")).toBeNull();
  });

  it("builds an ISO instant from a local due date and time", () => {
    const iso = remindIsoFromLocal("2026-08-21", "09:15");
    expect(iso).toBe(new Date(2026, 7, 21, 9, 15, 0).toISOString());
  });
});
