import { describe, it, expect } from "vitest";
import { nextOccurrence } from "./recurrence";

describe("nextOccurrence — daily", () => {
  it("adds one day", () => {
    expect(nextOccurrence("daily", "2024-01-15")).toBe("2024-01-16");
  });

  it("rolls over a month boundary", () => {
    expect(nextOccurrence("daily", "2024-01-31")).toBe("2024-02-01");
  });
});

describe("nextOccurrence — weekdays", () => {
  it("Monday through Thursday just add one day", () => {
    expect(nextOccurrence("weekdays", "2024-01-15")).toBe("2024-01-16"); // Mon -> Tue
  });

  it("Friday skips to Monday", () => {
    expect(nextOccurrence("weekdays", "2024-01-19")).toBe("2024-01-22"); // Fri -> Mon
  });

  it("Saturday skips to Monday", () => {
    expect(nextOccurrence("weekdays", "2024-01-20")).toBe("2024-01-22"); // Sat -> Mon
  });
});

describe("nextOccurrence — weekly:XXX", () => {
  it("finds the next occurrence within the week", () => {
    expect(nextOccurrence("weekly:FRI", "2024-01-15")).toBe("2024-01-19"); // Mon -> Fri
  });

  it("wraps to next week when the target day already passed", () => {
    expect(nextOccurrence("weekly:MON", "2024-01-17")).toBe("2024-01-22"); // Wed -> next Mon
  });

  it("is never the same day — a match on today's weekday jumps a full week", () => {
    expect(nextOccurrence("weekly:MON", "2024-01-15")).toBe("2024-01-22"); // Mon -> next Mon
  });

  it("rejects an invalid weekday code", () => {
    expect(nextOccurrence("weekly:XXX", "2024-01-15")).toBeNull();
  });
});

describe("nextOccurrence — monthly:DD", () => {
  it("finds the same day next month", () => {
    expect(nextOccurrence("monthly:15", "2024-01-15")).toBe("2024-02-15");
  });

  it("rolls December into January of the next year", () => {
    expect(nextOccurrence("monthly:15", "2024-12-15")).toBe("2025-01-15");
  });

  it("clamps to the last day of a shorter month", () => {
    expect(nextOccurrence("monthly:31", "2024-01-31")).toBe("2024-02-29"); // 2024 is a leap year
  });
});

describe("nextOccurrence — yearly:MM-DD", () => {
  it("finds the same date next year", () => {
    expect(nextOccurrence("yearly:03-14", "2024-03-14")).toBe("2025-03-14");
  });

  it("clamps Feb 29 in a non-leap target year", () => {
    expect(nextOccurrence("yearly:02-29", "2024-02-29")).toBe("2025-02-28");
  });
});

describe("nextOccurrence — invalid input", () => {
  it("returns null for an unrecognised rule", () => {
    expect(nextOccurrence("hourly", "2024-01-15")).toBeNull();
    expect(nextOccurrence("", "2024-01-15")).toBeNull();
  });
});
