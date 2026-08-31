import { describe, it, expect } from "vitest";
import { analyzeIntake } from "./intakeAnalyzer";
import { SAMPLES } from "./samples";

describe("intakeAnalyzer", () => {
  it("handles empty text gracefully", () => {
    const res = analyzeIntake("");
    expect(res.wordCount).toBe(0);
    expect(res.sourceFormat).toBe("PROSE");
    expect(res.candidateFigures).toHaveLength(0);
  });

  it("detects transcript format from timestamps", () => {
    const transcriptSample = SAMPLES.find((s) => s.id === "podcast-transcript")!;
    const res = analyzeIntake(transcriptSample.text);
    expect(res.sourceFormat).toBe("TRANSCRIPT");
    expect(res.hasTimestamps).toBe(true);
    expect(res.wordCount).toBeGreaterThan(150);
  });

  it("detects relay candidate in Black-Scholes 146-year history", () => {
    const bsSample = SAMPLES.find((s) => s.id === "black-scholes")!;
    const res = analyzeIntake(bsSample.text);
    expect(res.dateSpanYears).toBeGreaterThan(100);
    expect(res.datesFound.length).toBeGreaterThanOrEqual(3);
    const relayFigure = res.candidateFigures.find((f) => f.kind === "relay");
    expect(relayFigure).toBeDefined();
    expect(relayFigure?.confidence).toBeGreaterThan(0.8);
  });

  it("detects anatomy and contrast in Transformer sample", () => {
    const transformerSample = SAMPLES.find((s) => s.id === "transformer-architecture")!;
    const res = analyzeIntake(transformerSample.text);
    const anatomyFigure = res.candidateFigures.find((f) => f.kind === "anatomy");
    const contrastFigure = res.candidateFigures.find((f) => f.kind === "contrast");
    expect(anatomyFigure || contrastFigure).toBeDefined();
  });

  it("calculates reduction percentage properly", () => {
    const euvSample = SAMPLES.find((s) => s.id === "euv-lithography")!;
    const res = analyzeIntake(euvSample.text);
    expect(res.reductionPercentage).toBeGreaterThanOrEqual(0);
    expect(res.reductionPercentage).toBeLessThan(100);
    expect(res.targetWordCount).toBeLessThanOrEqual(800);
  });
});
