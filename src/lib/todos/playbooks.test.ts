import { describe, it, expect } from "vitest";
import {
  extractVariables,
  extractAllVariables,
  interpolateVariables,
  generateRunNumber,
  isStepLocked,
  computeStepLearning,
  STARTER_PLAYBOOKS,
} from "./playbooks";

describe("playbooks library", () => {
  it("extracts variable names from strings", () => {
    expect(extractVariables("Pull main and rebase {{branch}}")).toEqual(["branch"]);
    expect(extractVariables("Write code for {{ticket}} and test {{ticket}}")).toEqual(["ticket"]);
    expect(extractVariables("No variables here")).toEqual([]);
  });

  it("extracts all unique variables across steps", () => {
    const steps = [
      { title: "Pull main and rebase {{branch}}" },
      { title: "Write the code for {{ticket}}" },
      { title: "Review with {{author}} on {{branch}}" },
    ];
    expect(extractAllVariables(steps)).toEqual(["branch", "ticket", "author"]);
  });

  it("interpolates variables properly", () => {
    const res = interpolateVariables("Pull main and rebase {{branch}} for {{ticket}}", {
      branch: "auth-migration",
      ticket: "RIV-412",
    });
    expect(res).toBe("Pull main and rebase auth-migration for RIV-412");
  });

  it("generates 4-character hex run numbers", () => {
    const runNo = generateRunNumber();
    expect(runNo).toMatch(/^[0-9A-F]{4}$/);
  });

  it("enforces sequence lock rules", () => {
    // In SEQUENCE mode:
    // done: [true, false, false] -> step 0 unlocked, step 1 unlocked (now), step 2 locked
    expect(isStepLocked("SEQUENCE", 0, [true, false, false])).toBe(false);
    expect(isStepLocked("SEQUENCE", 1, [true, false, false])).toBe(false);
    expect(isStepLocked("SEQUENCE", 2, [true, false, false])).toBe(true);

    // In SET mode:
    // all steps unlocked
    expect(isStepLocked("SET", 2, [false, false, false])).toBe(false);
  });

  it("computes learning analytics", () => {
    const play = STARTER_PLAYBOOKS[0]; // Ship a branch
    const mockRuns = [
      {
        state: "KEPT",
        steps: [
          { title: "s1", energy: "errand" as const, optional: false, done: true },
          { title: "s2", energy: "deep" as const, optional: false, done: true },
          { title: "s3", energy: "shallow" as const, optional: false, done: true },
          { title: "s4", energy: "shallow" as const, optional: false, done: true },
          { title: "s5", energy: "errand" as const, optional: true, done: false }, // optional skipped
          { title: "s6", energy: "shallow" as const, optional: false, done: true },
        ],
      },
    ];

    const stats = computeStepLearning(play, mockRuns);
    expect(stats.length).toBe(6);
    expect(stats[0].percent).toBe(100);
    expect(stats[4].percent).toBe(0);
    expect(stats[4].isBad).toBe(true);
  });
});
