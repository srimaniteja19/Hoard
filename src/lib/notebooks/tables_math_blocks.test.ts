import { describe, it, expect } from "vitest";
import {
  Block,
  convertBlocksToMarkdown,
  computeWordCount,
  blocksToChunks,
} from "./blocks";

describe("Table, Math, Stat, and Timeline Blocks", () => {
  it("serializes TableBlock to standard markdown table with alignment separators", () => {
    const tableBlock: Block = {
      id: "tbl-1",
      type: "table",
      title: "Comparison Matrix",
      columns: [
        { id: "c1", title: "Feature", align: "left" },
        { id: "c2", title: "Score", align: "center" },
        { id: "c3", title: "Price", align: "right" },
      ],
      rows: [
        ["Speed", "10/10", "$99"],
        ["Design", "9/10", "$149"],
      ],
      hasHeaderRow: true,
      striped: true,
    };

    const md = convertBlocksToMarkdown("Test Note", [tableBlock]);
    expect(md).toContain("### Comparison Matrix");
    expect(md).toContain("| Feature | Score | Price |");
    expect(md).toContain("| :--- | :---: | ---: |");
    expect(md).toContain("| Speed | 10/10 | $99 |");
    expect(md).toContain("| Design | 9/10 | $149 |");

    const wc = computeWordCount([tableBlock]);
    expect(wc).toBeGreaterThanOrEqual(8);

    const chunks = blocksToChunks([tableBlock]);
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toContain("Feature, Score, Price");
    expect(chunks[0].text).toContain("Speed | 10/10 | $99");
  });

  it("serializes MathBlock to LaTeX display math format", () => {
    const mathBlock: Block = {
      id: "math-1",
      type: "math",
      title: "Einstein Field Equation",
      latex: "G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}",
      caption: "General relativity relation between geometry and energy-momentum",
    };

    const md = convertBlocksToMarkdown("Physics Note", [mathBlock]);
    expect(md).toContain("**Einstein Field Equation**");
    expect(md).toContain("$$\nG_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}\n$$");
    expect(md).toContain("*General relativity relation between geometry and energy-momentum*");
  });

  it("serializes StatBlock to formatted markdown quote", () => {
    const statBlock: Block = {
      id: "stat-1",
      type: "stat",
      label: "MONTHLY RECURRING REVENUE",
      value: "$42,500",
      change: "+18.4%",
      trend: "up",
      target: "$50,000",
      note: "Strong growth in Q3",
    };

    const md = convertBlocksToMarkdown("Dashboard Note", [statBlock]);
    expect(md).toContain("> **MONTHLY RECURRING REVENUE**: **$42,500** (▲ +18.4%)");
    expect(md).toContain("> Target: $50,000");
    expect(md).toContain("> *Strong growth in Q3*");
  });

  it("serializes TimelineBlock to structured markdown checklist", () => {
    const timelineBlock: Block = {
      id: "time-1",
      type: "timeline",
      title: "Launch Checklist",
      items: [
        { id: "i1", title: "API Audit", dateOrPhase: "W1", status: "completed", description: "All endpoints passed" },
        { id: "i2", title: "Frontend Polish", dateOrPhase: "W2", status: "current", description: "Design tokens synced" },
        { id: "i3", title: "Public Launch", dateOrPhase: "W3", status: "upcoming", description: "Announce on socials" },
      ],
    };

    const md = convertBlocksToMarkdown("Launch Plan", [timelineBlock]);
    expect(md).toContain("### Launch Checklist");
    expect(md).toContain("- [x] **API Audit** (W1): All endpoints passed");
    expect(md).toContain("- [*] **Frontend Polish** (W2): Design tokens synced");
    expect(md).toContain("- [ ] **Public Launch** (W3): Announce on socials");

    const wc = computeWordCount([timelineBlock]);
    expect(wc).toBeGreaterThanOrEqual(15);
  });
});
