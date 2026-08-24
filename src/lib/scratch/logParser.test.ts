import { describe, it, expect } from "vitest";
import { parseLogEntry, extractRelativeDate } from "./logParser";

describe("parseLogEntry & extractRelativeDate", () => {
  const refDate = new Date("2026-08-23T12:00:00Z"); // Sunday, Aug 23, 2026

  it("detects leading verb and extracts Film entity", () => {
    const res = parseLogEntry("watched Dune: Part Two #movies 9/10", refDate);
    expect(res.isLog).toBe(true);
    expect(res.entities.verb).toBe("WATCHED");
    expect(res.entities.label).toBe("Film");
    expect(res.entities.title).toBe("Dune: Part Two");
    expect(res.entities.rating).toBe("9/10");
    expect(res.tags).toContain("#movies");
    expect(res.occurredOn).toBe("2026-08-23");
  });

  it("extracts movement measure and relative date", () => {
    const res = parseLogEntry("walked 10 miles yesterday #fitness #walks", refDate);
    expect(res.isLog).toBe(true);
    expect(res.entities.verb).toBe("WALKED");
    expect(res.entities.label).toBe("Movement");
    expect(res.entities.measure).toBe("10");
    expect(res.entities.unit).toBe("MILES");
    expect(res.occurredOn).toBe("2026-08-22"); // Yesterday
    expect(res.entities.shiftNote).toBe("LOGGED SUN · HAPPENED SAT");
    expect(res.tags).toEqual(["#fitness", "#walks"]);
  });

  it("extracts person and place", () => {
    const res = parseLogEntry("saw Coffee with Sam at Verve", refDate);
    expect(res.isLog).toBe(true);
    expect(res.entities.verb).toBe("SAW");
    expect(res.entities.label).toBe("Person");
    expect(res.entities.person).toBe("Sam");
    expect(res.entities.place).toBe("Verve");
  });

  it("handles manual ~ override prefix", () => {
    const res = parseLogEntry("~ Finished reading Chapter 4 on typography", refDate);
    expect(res.isLog).toBe(true);
    expect(res.entities.verb).toBe("NOTED");
    expect(res.entities.title).toContain("Finished reading Chapter 4");
  });

  it("handles completely unstructured plain log entry safely without error", () => {
    const res = parseLogEntry("~ Felt off all day, didn't do much. Slept nine hours.", refDate);
    expect(res.isLog).toBe(true);
    expect(res.entities.isPlain).toBe(true);
    expect(res.entities.title).toContain("Felt off all day");
  });

  it("correctly identifies non-log scraps", () => {
    const res = parseLogEntry("? why does this keep happening #css", refDate);
    expect(res.isLog).toBe(false);
  });
});
