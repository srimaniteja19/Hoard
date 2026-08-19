import { describe, expect, it } from "vitest";
import { captureReceipt } from "./receipt";

describe("captureReceipt", () => {
  it("warns that a queued item is furniture unless read now", () => {
    const receipt = captureReceipt({
      destination: "queue",
      addedMinutes: 24,
      freeMinutes: 90,
      unfittedCount: 0,
      owedMinutes: 120,
      streak: 3,
    });
    expect(receipt.cta).toMatch(/SESSION/);
    expect(receipt.line).toMatch(/24m/);
    expect(receipt.line).toMatch(/2h 24m owed/);
  });

  it("flags an agenda item that will not fit", () => {
    const receipt = captureReceipt({
      destination: "agenda",
      addedMinutes: 40,
      freeMinutes: 10,
      unfittedCount: 2,
      owedMinutes: 0,
      streak: 0,
    });
    expect(receipt.href).toBe("/todos");
    expect(receipt.line).toMatch(/does not fit/);
  });

  it("prints an honest streak on the record, including UNKNOWN", () => {
    expect(
      captureReceipt({
        destination: "record",
        addedMinutes: 0,
        freeMinutes: 10,
        unfittedCount: 0,
        owedMinutes: 0,
        streak: null,
      }).line,
    ).toMatch(/UNKNOWN/);
  });
});
