import { describe, it, expect } from "vitest";
import { checkCycleInMemory, MAX_SUPERSESSION_DEPTH } from "./supersession";

describe("checkCycleInMemory", () => {
  it("rejects direct self-supersession", () => {
    const result = checkCycleInMemory("A", "A", () => null);
    expect(result.hasCycle).toBe(true);
    expect(result.reason).toContain("cannot supersede itself");
  });

  it("allows valid non-cyclic replacement", () => {
    const chain: Record<string, string | null> = {
      B: null,
    };
    const result = checkCycleInMemory("A", "B", (id) => chain[id]);
    expect(result.hasCycle).toBe(false);
  });

  it("detects 2-node cycle (A replaces B, B replaces A)", () => {
    const chain: Record<string, string | null> = {
      B: "A",
    };
    // Attempting to set A.supersededById = B when B.supersededById = A
    const result = checkCycleInMemory("A", "B", (id) => chain[id]);
    expect(result.hasCycle).toBe(true);
    expect(result.reason).toContain("Supersession cycle detected");
  });

  it("detects multi-node cycle (A -> B -> C -> A)", () => {
    const chain: Record<string, string | null> = {
      C: "B",
      B: "A",
    };
    // Setting A.supersededById = C creates A -> C -> B -> A loop
    const result = checkCycleInMemory("A", "C", (id) => chain[id]);
    expect(result.hasCycle).toBe(true);
    expect(result.reason).toContain("Supersession cycle detected");
  });

  it("rejects when max depth limit (10) is exceeded", () => {
    // Linear chain of 12 elements without a loop
    const chain: Record<string, string | null> = {};
    for (let i = 1; i <= 12; i++) {
      chain[`node_${i}`] = `node_${i + 1}`;
    }
    const result = checkCycleInMemory("target", "node_1", (id) => chain[id]);
    expect(result.hasCycle).toBe(true);
    expect(result.reason).toContain("depth limit exceeded");
  });

  it("allows deep valid chain within max depth limit", () => {
    const chain: Record<string, string | null> = {};
    for (let i = 1; i < MAX_SUPERSESSION_DEPTH - 1; i++) {
      chain[`node_${i}`] = `node_${i + 1}`;
    }
    chain[`node_${MAX_SUPERSESSION_DEPTH - 1}`] = null;
    const result = checkCycleInMemory("target", "node_1", (id) => chain[id]);
    expect(result.hasCycle).toBe(false);
  });
});
