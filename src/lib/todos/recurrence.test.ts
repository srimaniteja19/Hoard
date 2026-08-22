import { describe, it, expect } from "vitest";
import { nextOccurrence, buildSuccessorFields, ruleOccursOn, SuccessorTemplate, CompletedInstance } from "./recurrence";

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

describe("ruleOccursOn", () => {
  it("matches daily, weekdays, and a weekly weekday", () => {
    expect(ruleOccursOn("daily", "2024-01-15")).toBe(true);
    expect(ruleOccursOn("weekdays", "2024-01-15")).toBe(true); // Monday
    expect(ruleOccursOn("weekdays", "2024-01-20")).toBe(false); // Saturday
    expect(ruleOccursOn("weekly:MON", "2024-01-15")).toBe(true);
    expect(ruleOccursOn("weekly:MON", "2024-01-16")).toBe(false);
  });
});

describe("buildSuccessorFields", () => {
  const root: SuccessorTemplate = {
    title: "Standup notes",
    note: "keep it short",
    energy: "SHALLOW",
    estimatedMinutes: 10,
    recurrenceRule: "daily",
  };

  const completedInstance: CompletedInstance = {
    id: "instance-1",
    recurrenceParentId: "root-id",
    dueDate: "2024-01-15",
    completedOn: null,
    originalDueDate: null,
    seriesPosition: 3,
  };

  it("inherits template fields from the root, not the completed instance", () => {
    const fields = buildSuccessorFields(root, completedInstance);
    expect(fields).toEqual({
      title: "Standup notes",
      note: "keep it short",
      energy: "SHALLOW",
      estimatedMinutes: 10,
      dueDate: "2024-01-16",
      originalDueDate: "2024-01-16",
      recurrenceRule: "daily",
      recurrenceParentId: "root-id",
      seriesPosition: 4,
    });
  });

  it("uses the completed instance's own id as recurrenceParentId when it has no parent (it's the root)", () => {
    const fields = buildSuccessorFields(root, { ...completedInstance, id: "root-id", recurrenceParentId: null });
    expect(fields?.recurrenceParentId).toBe("root-id");
  });

  it("defaults seriesPosition to 2 when the completed instance has none", () => {
    const fields = buildSuccessorFields(root, { ...completedInstance, seriesPosition: null });
    expect(fields?.seriesPosition).toBe(2);
  });

  it("falls back from dueDate to completedOn to originalDueDate for the anchor date", () => {
    const fields = buildSuccessorFields(root, {
      ...completedInstance,
      dueDate: null,
      completedOn: "2024-02-01",
      originalDueDate: "2024-03-01",
    });
    expect(fields?.dueDate).toBe("2024-02-02"); // anchored on completedOn, not originalDueDate

    const fromOriginal = buildSuccessorFields(root, {
      ...completedInstance,
      dueDate: null,
      completedOn: null,
      originalDueDate: "2024-03-01",
    });
    expect(fromOriginal?.dueDate).toBe("2024-03-02");
  });

  it("returns null when the root's recurrenceRule has been cleared, even if the instance still has one", () => {
    expect(buildSuccessorFields({ ...root, recurrenceRule: null }, completedInstance)).toBeNull();
  });

  it("returns null when there's no anchor date at all", () => {
    const fields = buildSuccessorFields(root, {
      ...completedInstance,
      dueDate: null,
      completedOn: null,
      originalDueDate: null,
    });
    expect(fields).toBeNull();
  });

  it("returns null when the rule doesn't resolve to a next occurrence", () => {
    const fields = buildSuccessorFields({ ...root, recurrenceRule: "weekly:XYZ" }, completedInstance);
    expect(fields).toBeNull();
  });

  it("anchors a late completion on completedOn so the next instance is after today", () => {
    const fields = buildSuccessorFields(root, {
      ...completedInstance,
      dueDate: "2024-01-15",
      completedOn: "2024-01-18",
    });
    expect(fields?.dueDate).toBe("2024-01-19");
  });
});
