import { describe, expect, it } from "vitest";
import { sigil, sigilColorTokens, normalizeSigilName, computeSigilLayout, resolveSigilToken } from "./sigil";

describe("sigil", () => {
  it("produces identical output for the same name across 1,000 runs", () => {
    const first = sigil("Distributed systems");
    for (let i = 0; i < 1000; i++) {
      const result = sigil("Distributed systems");
      expect(result.svg).toBe(first.svg);
      expect(result.hash).toBe(first.hash);
    }
  });

  it("normalizes whitespace and case to the same sigil", () => {
    const base = sigil("Distributed Systems");
    expect(sigil("distributed systems")).toEqual(base);
    expect(sigil("  Distributed Systems  ")).toEqual(base);
    expect(sigil("DISTRIBUTED SYSTEMS")).toEqual(base);
    expect(sigil("\tDistributed Systems\n")).toEqual(base);
  });

  it("normalizeSigilName matches what sigil() normalizes internally", () => {
    expect(normalizeSigilName("  Foo Bar  ")).toBe("foo bar");
    expect(normalizeSigilName("FOO BAR")).toBe("foo bar");
  });

  it("produces different output for different names (spot check)", () => {
    const a = sigil("postgres");
    const b = sigil("typescript");
    expect(a.svg).not.toBe(b.svg);
    expect(a.hash).not.toBe(b.hash);
  });

  it("has at most ~2% palette+layout collisions across 1,000 distinct names", () => {
    const names = Array.from({ length: 1000 }, (_, i) => `collection-${i}-${i * 7919}`);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(1000);

    const signatures = new Set<string>();
    let collisions = 0;
    for (const name of names) {
      const { svg } = sigil(name);
      // Strip the name-derived aria-label so we're comparing visual layout,
      // not the (necessarily unique) label text.
      const visualSignature = svg.replace(/aria-label="[^"]*"/, "");
      if (signatures.has(visualSignature)) {
        collisions++;
      } else {
        signatures.add(visualSignature);
      }
    }

    const collisionRate = collisions / names.length;
    expect(collisionRate).toBeLessThanOrEqual(0.02);
  });

  it("only emits var(--token) color references, never literal hex", () => {
    const { svg } = sigil("no hex literals allowed");
    expect(svg).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    expect(svg).toMatch(/var\(--/);
  });

  it("respects a custom size", () => {
    const { svg } = sigil("sized", 200);
    expect(svg).toContain('viewBox="0 0 200 200"');
  });

  it("escapes special characters in the name for the aria-label", () => {
    const { svg } = sigil('Name with "quotes" & <tags>');
    expect(svg).not.toContain('"quotes"');
    expect(svg).toContain("&quot;quotes&quot;");
    expect(svg).toContain("&amp;");
    expect(svg).toContain("&lt;tags&gt;");
  });
});

describe("sigilColorTokens", () => {
  it("matches the tokens actually used by sigil() for the same name", () => {
    const name = "token consistency check";
    const { bgToken, accentToken } = sigilColorTokens(name);
    const { svg } = sigil(name);
    expect(svg).toContain(`fill="var(${bgToken})"`);
    // accentToken is only used on ~18% of drawn cells, so just confirm it's a
    // valid token name rather than asserting it always appears in every sigil.
    expect(["--yel", "--pink", "--cyan", "--lime", "--orange", "--violet", "--mint"]).toContain(accentToken);
  });

  it("is deterministic across repeated calls", () => {
    const a = sigilColorTokens("stability check");
    const b = sigilColorTokens("stability check");
    expect(a).toEqual(b);
  });
});

describe("computeSigilLayout", () => {
  it("is deterministic and matches the tokens sigil() renders", () => {
    const layout = computeSigilLayout("layout consistency", 140);
    const { svg } = sigil("layout consistency", 140);
    expect(svg).toContain(`fill="var(${layout.bgToken})"`);
    expect(layout.shapes.length).toBeGreaterThan(0);

    const again = computeSigilLayout("layout consistency", 140);
    expect(again).toEqual(layout);
  });

  it("scales shape coordinates with the requested size", () => {
    const small = computeSigilLayout("scale check", 100);
    const large = computeSigilLayout("scale check", 200);
    expect(large.shapes[0].cell).toBeCloseTo(small.shapes[0].cell * 2, 5);
  });
});

describe("resolveSigilToken", () => {
  it("resolves every token used by computeSigilLayout to a literal hex value", () => {
    const layout = computeSigilLayout("hex resolution check");
    expect(resolveSigilToken(layout.bgToken)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(resolveSigilToken(layout.accentToken)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(resolveSigilToken("--ink")).toBe("#000000");
  });
});
